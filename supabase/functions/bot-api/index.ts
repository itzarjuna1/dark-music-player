import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-api-key, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// ---------------- YouTube API key pool ----------------
// Supports a comma-separated list in YOUTUBE_API_KEY for rotation when one
// key hits quota or is busy. Mirrors the YouTubeKeyPool pattern from the bot.
class YouTubeKeyPool {
  private keys: string[];
  private idx = 0;
  private dead = new Set<string>();
  constructor(raw: string) {
    this.keys = raw
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  size() {
    return this.keys.length;
  }
  next(): string | null {
    if (this.keys.length === 0) return null;
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[(this.idx + i) % this.keys.length];
      if (!this.dead.has(k)) {
        this.idx = (this.idx + i + 1) % this.keys.length;
        return k;
      }
    }
    return null;
  }
  markDead(k: string) {
    this.dead.add(k);
  }
}

const pool = new YouTubeKeyPool(Deno.env.get('YOUTUBE_API_KEY') || '');

async function ytFetch(buildUrl: (key: string) => string): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 0; attempt < Math.max(1, pool.size()); attempt++) {
    const key = pool.next();
    if (!key) break;
    const res = await fetch(buildUrl(key));
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    const reason = data?.error?.errors?.[0]?.reason || '';
    if (
      res.status === 403 &&
      (reason === 'quotaExceeded' ||
        reason === 'rateLimitExceeded' ||
        reason === 'dailyLimitExceeded')
    ) {
      pool.markDead(key);
      lastErr = data;
      continue;
    }
    throw new Error(data?.error?.message || `YouTube API error ${res.status}`);
  }
  throw new Error(lastErr?.error?.message || 'All YouTube API keys exhausted');
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    parseInt(m[1] || '0') * 3600 +
    parseInt(m[2] || '0') * 60 +
    parseInt(m[3] || '0')
  );
}

function cleanTitle(rawTitle: string, channel: string) {
  let artist = (channel || '').replace(/ - Topic$/, '').replace(/VEVO$/, '').trim();
  let title = rawTitle || '';
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  }
  title = title
    .replace(/\s*[\(\[](Official|Lyrics?|Audio|Music Video|HD|HQ).*?[\)\]]/gi, '')
    .replace(/\s*\|.*$/g, '')
    .trim();
  return { title, artist };
}

async function searchYoutube(
  query: string,
  maxResults: number,
  shortsOnly: boolean,
) {
  // 1. search
  const searchData = await ytFetch((key) => {
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.searchParams.set('part', 'snippet');
    u.searchParams.set('q', shortsOnly ? `${query} #shorts` : `${query} music`);
    u.searchParams.set('type', 'video');
    if (!shortsOnly) u.searchParams.set('videoCategoryId', '10');
    if (shortsOnly) u.searchParams.set('videoDuration', 'short');
    u.searchParams.set('maxResults', String(Math.min(maxResults * 2, 50)));
    u.searchParams.set('key', key);
    return u.toString();
  });

  const ids = (searchData.items || [])
    .map((i: any) => i.id?.videoId)
    .filter(Boolean)
    .join(',');
  if (!ids) return [];

  // 2. details
  const detailsData = await ytFetch((key) => {
    const u = new URL('https://www.googleapis.com/youtube/v3/videos');
    u.searchParams.set('part', 'contentDetails,snippet');
    u.searchParams.set('id', ids);
    u.searchParams.set('key', key);
    return u.toString();
  });

  const results = (detailsData.items || [])
    .map((v: any) => {
      const duration = parseDuration(v.contentDetails?.duration || 'PT0S');
      const { title, artist } = cleanTitle(
        v.snippet?.title || '',
        v.snippet?.channelTitle || '',
      );
      const thumb =
        v.snippet?.thumbnails?.high?.url ||
        v.snippet?.thumbnails?.medium?.url ||
        v.snippet?.thumbnails?.default?.url;
      return {
        video_id: v.id,
        videoId: v.id, // backward compat
        title,
        artist,
        channel: v.snippet?.channelTitle || '',
        thumbnail: thumb,
        duration,
        youtube_url: `https://www.youtube.com/watch?v=${v.id}`,
        is_short: duration > 0 && duration <= 60,
      };
    })
    .filter((r: any) => (shortsOnly ? r.is_short : true))
    .slice(0, maxResults);

  return results;
}

// ---------------- HTTP handler ----------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const action = parts[parts.length - 1] || 'info';

  // Public info endpoint
  if (action === 'info' || action === 'bot-api') {
    return json({
      service: 'UpperMoon Tunes Bot API',
      version: '2.0',
      note:
        'Metadata only — stream/download extraction is the bot\'s responsibility.',
      endpoints: {
        'GET  /search?q=<query>&limit=10': 'Search YouTube music videos (metadata)',
        'GET  /shorts?q=<query>&limit=10': 'Search YouTube Shorts (<= 60s)',
        'POST /nowplaying': 'Update what is currently playing',
        'GET  /nowplaying': 'Get current playing track with progress bar',
      },
      auth:
        'Send X-API-Key header (or ?api_key=). Get a key from the Developer Portal.',
      youtube_keys_loaded: pool.size(),
    });
  }

  // ----- API key auth -----
  const apiKey =
    req.headers.get('x-api-key') ||
    url.searchParams.get('api_key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return json(
      { error: 'Missing API key. Send X-API-Key header or ?api_key= param.' },
      401,
    );
  }

  const { data: keyRow, error: keyErr } = await supabase
    .from('api_keys')
    .select('*')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (keyErr || !keyRow) {
    return json({ error: 'Invalid or inactive API key' }, 401);
  }
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return json(
      { error: 'API key expired. Renew at https://t.me/theinfinity_support' },
      403,
    );
  }
  if (!keyRow.is_owner && keyRow.requests_used >= keyRow.monthly_quota) {
    return json(
      {
        error:
          'Monthly quota exceeded. Upgrade at https://t.me/theinfinity_support',
      },
      429,
    );
  }

  const recordUsage = async (status: number) => {
    await supabase.from('api_request_logs').insert({
      api_key: apiKey,
      endpoint: action,
      status,
    });
    if (!keyRow.is_owner) {
      await supabase
        .from('api_keys')
        .update({ requests_used: keyRow.requests_used + 1 })
        .eq('id', keyRow.id);
    }
  };

  try {
    // ---------- SEARCH ----------
    if (action === 'search') {
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
      if (!q) return json({ error: 'Missing q parameter' }, 400);
      if (pool.size() === 0) return json({ error: 'YouTube API not configured' }, 503);

      const results = await searchYoutube(q, limit, false);
      await recordUsage(200);
      return json({
        results,
        count: results.length,
        quota_remaining: keyRow.is_owner
          ? 'unlimited'
          : keyRow.monthly_quota - keyRow.requests_used - 1,
      });
    }

    // ---------- SHORTS ----------
    if (action === 'shorts') {
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
      if (!q) return json({ error: 'Missing q parameter' }, 400);
      if (pool.size() === 0) return json({ error: 'YouTube API not configured' }, 503);

      const results = await searchYoutube(q, limit, true);
      await recordUsage(200);
      return json({
        results,
        count: results.length,
        quota_remaining: keyRow.is_owner
          ? 'unlimited'
          : keyRow.monthly_quota - keyRow.requests_used - 1,
      });
    }

    // ---------- PLAY (top match for /play <query>) ----------
    // Returns the first matching YouTube track so the bot can pipe it to PyTgCalls.
    if (action === 'play') {
      const q = url.searchParams.get('q') || url.searchParams.get('query');
      if (!q) return json({ error: 'Missing q parameter' }, 400);
      if (pool.size() === 0) return json({ error: 'YouTube API not configured' }, 503);

      const results = await searchYoutube(q, 1, false);
      await recordUsage(200);
      if (results.length === 0) return json({ error: 'No results' }, 404);
      const t = results[0];
      return json({
        ok: true,
        track: t,
        // bot uses this with yt-dlp/your downloader to extract the stream
        stream_url: `https://www.youtube.com/watch?v=${t.video_id}`,
        instructions: 'Pipe stream_url through yt-dlp -f bestaudio -> ffmpeg -> PyTgCalls',
      });
    }

    // ---------- CLONES (owner only) ----------
    // Used by your hoster bot to fetch all active clone configs (bot_token, string_session, logger_chat_id).
    // The bot then spawns a Pyrogram + PyTgCalls instance for each clone on your VPS.
    if (action === 'clones') {
      if (!keyRow.is_owner) {
        return json({ error: 'Owner API key required for clones endpoint' }, 403);
      }

      if (req.method === 'GET') {
        const { data: clones, error } = await supabase
          .from('bot_clones')
          .select('id, name, bot_token, logger_chat_id, assistant_string_session, assistant_name, api_id, api_hash, is_active, last_heartbeat, notes, created_at, updated_at')
          .eq('owner_api_key', apiKey)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, 500);
        await recordUsage(200);
        return json({ clones: clones || [], count: (clones || []).length });
      }

      if (req.method === 'POST') {
        // Heartbeat: bot pings to mark a clone as alive
        const body = await req.json().catch(() => ({}));
        if (body?.heartbeat && body?.clone_id) {
          await supabase
            .from('bot_clones')
            .update({ last_heartbeat: new Date().toISOString() })
            .eq('id', body.clone_id)
            .eq('owner_api_key', apiKey);
          await recordUsage(200);
          return json({ ok: true });
        }
        return json({ error: 'Invalid clones POST body' }, 400);
      }

      return json({ error: 'Method not allowed' }, 405);
    }

    // ---------- NOW PLAYING ----------
    if (action === 'nowplaying') {
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const { title, artist, album, cover, video_id, duration, position, is_playing } =
          body;
        if (!title) return json({ error: 'Missing title' }, 400);

        await supabase.from('now_playing').delete().eq('api_key', apiKey);
        const { error: insErr } = await supabase.from('now_playing').insert({
          api_key: apiKey,
          api_key_id: keyRow.id,
          title,
          artist: artist || null,
          album: album || null,
          cover: cover || null,
          video_id: video_id || null,
          duration: Math.max(0, parseInt(duration) || 0),
          position: Math.max(0, parseInt(position) || 0),
          is_playing: is_playing !== false,
        });
        if (insErr) return json({ error: insErr.message }, 500);
        await recordUsage(200);
        return json({ success: true });
      }

      const { data: np } = await supabase
        .from('now_playing')
        .select('*')
        .eq('api_key', apiKey)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      await recordUsage(200);
      if (!np) return json({ playing: false });

      const dur = np.duration || 1;
      const pos = Math.min(np.position || 0, dur);
      const pct = Math.round((pos / dur) * 100);
      const barLen = 20;
      const filled = Math.round((pct / 100) * barLen);
      const bar = '▓'.repeat(filled) + '░'.repeat(barLen - filled);
      const fmt = (s: number) =>
        `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

      return json({
        playing: np.is_playing,
        title: np.title,
        artist: np.artist,
        album: np.album,
        cover: np.cover,
        video_id: np.video_id,
        duration: np.duration,
        position: np.position,
        progress_percent: pct,
        progress_bar: `${bar} ${fmt(pos)} / ${fmt(dur)}`,
        updated_at: np.updated_at,
      });
    }

    return json(
      {
        error: `Unknown endpoint: ${action}`,
        available: ['/search', '/shorts', '/nowplaying'],
      },
      404,
    );
  } catch (e: any) {
    await recordUsage(500);
    return json({ error: e?.message || 'Server error' }, 500);
  }
});
