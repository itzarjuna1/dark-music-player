import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Body = { room_id: string; text: string };

async function callAI(persona: string | null, text: string): Promise<string> {
  if (!LOVABLE_API_KEY) return "AI is unavailable right now.";
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': LOVABLE_API_KEY,
        'X-Lovable-AIG-SDK': 'raw',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: persona || 'You are a friendly community chat bot. Keep replies short (under 100 words).' },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!res.ok) return `AI error (${res.status}).`;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content?.trim() || '…';
  } catch {
    return 'AI request failed.';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: Body;
  try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  if (!body?.room_id || typeof body.text !== 'string') return json({ error: 'invalid' }, 400);
  const text = body.text.trim();
  if (!text.startsWith('/')) return json({ ok: true, ignored: true });

  const [rawCmd, ...restParts] = text.slice(1).split(/\s+/);
  const arg = restParts.join(' ');
  // command may be "cmd" or "cmd@bot"
  const [cmdName, atBot] = rawCmd.split('@');
  const command = '/' + cmdName.toLowerCase();

  // Load installed bots for this room
  const { data: installs } = await admin
    .from('bot_room_installs')
    .select('bot_id, bots:bot_id(*)')
    .eq('room_id', body.room_id);
  const bots = ((installs || []) as any[]).map((r) => r.bots).filter((b) => b?.is_active && b?.bot_type === 'in_app');

  const targeted = atBot ? bots.filter((b) => b.username.toLowerCase() === atBot.toLowerCase()) : bots;
  if (!targeted.length) return json({ ok: true, no_bot: true });

  const results: any[] = [];
  for (const bot of targeted) {
    const { data: cmdRow } = await admin
      .from('bot_commands').select('*').eq('bot_id', bot.id).eq('command', command).maybeSingle();

    let response_text: string | null = null;
    let buttons: any = null;

    if (cmdRow) {
      buttons = cmdRow.buttons ?? null;
      switch (cmdRow.response_kind) {
        case 'static':
          response_text = cmdRow.response_text || '(no response set)';
          break;
        case 'music_play':
          response_text = arg ? `🎵 Playing "${arg}"…` : 'Usage: /play <song name>';
          break;
        case 'music_queue':
          response_text = arg ? `➕ Queued "${arg}"` : 'Usage: /queue <song name>';
          break;
        case 'ai':
          response_text = await callAI(bot.ai_persona, arg || text);
          break;
      }
    } else if (bot.ai_enabled) {
      response_text = await callAI(bot.ai_persona, text);
    } else {
      continue;
    }

    // Insert the bot's reply. user_id must satisfy NOT NULL; use bot owner as the row's user_id.
    const { data: inserted, error } = await admin.from('chat_messages').insert({
      room_id: body.room_id,
      user_id: bot.owner_id,
      message: response_text,
      sender_kind: 'bot',
      bot_id: bot.id,
      buttons,
    }).select().single();
    if (error) results.push({ bot: bot.username, error: error.message });
    else results.push({ bot: bot.username, id: inserted.id });
  }

  return json({ ok: true, results });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
