const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, artist, album, cover, duration } = await req.json();

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!botToken || !chatId) {
      console.error('Telegram credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Telegram not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const durationFormatted = duration 
      ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
      : 'Unknown';

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const message = `🎵 *Now Playing*\n\n` +
      `*Title:* ${escapeMarkdown(title)}\n` +
      `*Artist:* ${escapeMarkdown(artist)}\n` +
      `*Album:* ${escapeMarkdown(album)}\n` +
      `*Duration:* ${durationFormatted}\n\n` +
      `🕐 _${timestamp} UTC_`;

    // Send photo with caption if cover exists, otherwise just text
    if (cover && cover.startsWith('http')) {
      const photoResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: cover,
            caption: message,
            parse_mode: 'Markdown',
          }),
        }
      );

      const photoResult = await photoResponse.json();
      
      if (!photoResult.ok) {
        // Fallback to text message if photo fails
        console.log('Photo failed, sending text:', photoResult);
        await sendTextMessage(botToken, chatId, message);
      }
    } else {
      await sendTextMessage(botToken, chatId, message);
    }

    console.log('Telegram log sent:', title);
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending Telegram log:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function escapeMarkdown(text: string): string {
  if (!text) return 'Unknown';
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

async function sendTextMessage(botToken: string, chatId: string, message: string) {
  await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    }
  );
}
