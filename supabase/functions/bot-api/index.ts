import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  // Path can be: /bot-api/search, /search, etc.
  const parts = url.pathname.split('/').filter(Boolean);
  const action = parts[parts.length - 1] || 'info';

  // Public info endpoint - no key required
  if (action === 'info' || action === 'bot-api') {
    return json({
      service: 'UpperMoon Tunes Bot API',
      version: '1.0',
      endpoints: {
        '/search?q=<query>&limit=20': 'Search YouTube tracks (returns videoId for bot to handle yt-dlp)',
        '/stream?id=<videoId>': 'Get streaming metadata for a video (bot streams via its own yt-dlp)',
        '/download?id=<videoId>': 'Get download metadata for a video',
        '/nowplaying (POST)': 'Update what is currently playing (for Telegram voice chat display)',
        '/nowplaying (GET)': 'Get current playing track info with progress',
      },
      auth: 'Pass X-API-Key header or ?api_key= query param',
    });
  }

  // Extract API key
  const apiKey =
    req.headers.get('x-api-key') ||
    url.searchParams.get('api_key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!apiKey) {
    return json({ error: 'Missing API key. Provide X-API-Key header or ?api_key= param.' }, 401);
  }

  // Validate the API key
  const { data: keyRow, error: keyErr } = await supabase
    .from('api_keys')
    .select('*')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (keyErr || !keyRow) {
    return json({ error: 'Invalid or inactive API key' }, 401);
  }

  // Check expiry
  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    return json({ error: 'API key expired. Renew at https://t.me/theinfinity_support' }, 403);
  }

  // Quota check (owner keys are unlimited)
  if (!keyRow.is_owner && keyRow.requests_used >= keyRow.monthly_quota) {
    return json({ error: 'Monthly quota exceeded. Upgrade at https://t.me/theinfinity_support' }, 429);
  }

  // Log + increment usage
  await supabase.from('api_request_logs').insert({
    api_key: apiKey,
    endpoint: action,
    status: 200,
  });

  if (!keyRow.is_owner) {
    await supabase
      .from('api_keys')
      .update({ requests_used: keyRow.requests_used + 1 })
      .eq('id', keyRow.id);
  }

  try {
    // ---------- SEARCH ----------
    if (action === 'search') {
      const query = url.searchParams.get('q') || url.searchParams.get('query');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
      if (!query) return json({ error: 'Missing q parameter' }, 400);

      const ytKey = Deno.env.get('YOUTUBE_API_KEY');
      if (!ytKey) return json({ error: 'YouTube API not configured' }, 500);

      const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('q', `${query} music`);
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('videoCategoryId', '10');
      searchUrl.searchParams.set('maxResults', String(limit));
      searchUrl.searchParams.set('key', ytKey);

      const sr = await fetch(searchUrl.toString());
      const sd = await sr.json();
      if (!sr.ok) return json({ error: sd.error?.message || 'YouTube error' }, 502);

      const ids = (sd.items || []).map((i: any) => i.id.videoId).filter(Boolean).join(',');
      if (!ids) return json({ tracks: [] });

      const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.searchParams.set('part', 'contentDetails,snippet');
      detailsUrl.searchParams.set('id', ids);
      detailsUrl.searchParams.set('key', ytKey);
      const dr = await fetch(detailsUrl.toString());
      const dd = await dr.json();

      const tracks = (dd.items || []).map((v: any) => {
        const dur = parseDuration(v.contentDetails?.duration || 'PT0S');
        const title = v.snippet?.title || '';
        let artist = (v.snippet?.channelTitle || '').replace(/ - Topic$/, '').replace(/VEVO$/, '');
        let songTitle = title;
        if (title.includes(' - ')) {
          const p = title.split(' - ');
          artist = p[0].trim();
          songTitle = p.slice(1).join(' - ').trim();
        }
        return {
          videoId: v.id,
          title: songTitle.replace(/\s*[\(\[](Official|Lyrics?|Audio|Music Video).*?[\)\]]/gi, '').trim(),
          artist,
          thumbnail: v.snippet?.thumbnails?.high?.url,
          duration: dur,
          youtube_url: `https://www.youtube.com/watch?v=${v.id}`,
        };
      });

      return json({ tracks, quota_remaining: keyRow.is_owner ? 'unlimited' : keyRow.monthly_quota - keyRow.requests_used - 1 });
    }

    // ---------- STREAM / DOWNLOAD (metadata for bot's yt-dlp) ----------
    if (action === 'stream' || action === 'download') {
      const id = url.searchParams.get('id') || url.searchParams.get('videoId');
      if (!id) return json({ error: 'Missing id parameter' }, 400);

      return json({
        videoId: id,
        youtube_url: `https://www.youtube.com/watch?v=${id}`,
        thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        instructions: action === 'stream'
          ? 'Use yt-dlp on your bot side to extract audio: yt-dlp -f bestaudio -o - <youtube_url> | ffmpeg ...'
          : 'Use yt-dlp on your bot side to download: yt-dlp -x --audio-format mp3 <youtube_url>',
        ytdlp_command_stream: `yt-dlp -f bestaudio -g https://www.youtube.com/watch?v=${id}`,
        ytdlp_command_download: `yt-dlp -x --audio-format mp3 https://www.youtube.com/watch?v=${id}`,
      });
    }

    // ---------- NOW PLAYING ----------
    if (action === 'nowplaying') {
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        const { title, artist, album, cover, video_id, duration, position, is_playing } = body;
        if (!title) return json({ error: 'Missing title' }, 400);

        // Upsert: delete prev for this key, then insert
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
        return json({ success: true });
      }

      // GET
      const { data: np } = await supabase
        .from('now_playing')
        .select('*')
        .eq('api_key', apiKey)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!np) return json({ playing: false });

      // Build progress bar
      const dur = np.duration || 1;
      const pos = Math.min(np.position || 0, dur);
      const pct = Math.round((pos / dur) * 100);
      const barLen = 20;
      const filled = Math.round((pct / 100) * barLen);
      const bar = '▓'.repeat(filled) + '░'.repeat(barLen - filled);
      const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

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

    return json({ error: `Unknown endpoint: ${action}` }, 404);
  } catch (e: any) {
    return json({ error: e?.message || 'Server error' }, 500);
  }
});

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0');
}
