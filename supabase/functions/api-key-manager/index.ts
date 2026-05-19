import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const PLANS: Record<string, { quota: number; days: number | null; price: string }> = {
  free: { quota: 100, days: 7, price: 'Free trial (7 days, 100 reqs)' },
  month: { quota: 50000, days: 30, price: '₹200 / month' },
  six_months: { quota: 500000, days: 180, price: '₹1200 / 6 months' },
  year: { quota: 1500000, days: 365, price: '₹2000 / year' },
  owner: { quota: 99999999, days: null, price: 'Owner / Admin (free)' },
};

function generateKey(prefix = 'um'): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { action, name, plan, contact_info, owner_pass, key_id } = body;

    if (action === 'create') {
      const planKey = String(plan || 'free');
      if (!PLANS[planKey]) return json({ error: 'Invalid plan' }, 400);

      let isOwner = false;
      if (planKey === 'owner') {
        const expected = Deno.env.get('OWNER_MASTER_PASS');
        if (!expected || owner_pass !== expected) {
          return json({ error: 'Invalid owner pass. Contact admin.' }, 403);
        }
        isOwner = true;
      }

      const cfg = PLANS[planKey];
      const newKey = generateKey(isOwner ? 'umowner' : 'um');
      const expiresAt = cfg.days ? new Date(Date.now() + cfg.days * 86400000).toISOString() : null;

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name: name || (isOwner ? 'Owner Master Key' : `${planKey} key`),
          api_key: newKey,
          plan: planKey,
          is_owner: isOwner,
          monthly_quota: cfg.quota,
          expires_at: expiresAt,
          contact_info: contact_info || null,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);

      const projectId = Deno.env.get('SUPABASE_PROJECT_ID') ||
        (Deno.env.get('SUPABASE_URL') || '').match(/https:\/\/([^.]+)/)?.[1];
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/bot-api`;

      return json({
        success: true,
        api_key: newKey,
        api_url: baseUrl,
        plan: planKey,
        quota: cfg.quota,
        expires_at: expiresAt,
        endpoints: {
          search: `${baseUrl}/search?q=<query>`,
          stream: `${baseUrl}/stream?id=<videoId>`,
          download: `${baseUrl}/download?id=<videoId>`,
          nowplaying: `${baseUrl}/nowplaying`,
        },
        usage_example: `curl -H "X-API-Key: ${newKey}" "${baseUrl}/search?q=arijit+singh"`,
      });
    }

    if (action === 'revoke') {
      if (!key_id) return json({ error: 'Missing key_id' }, 400);
      const { error } = await supabase.from('api_keys').update({ is_active: false }).eq('id', key_id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    if (action === 'plans') {
      return json({ plans: PLANS });
    }

    // ---------- BOT CLONES (owner only, private) ----------
    // Helper: validate caller is an owner via owner_api_key in body
    const requireOwner = async (k?: string) => {
      if (!k) return { ok: false, msg: 'Missing owner_api_key' };
      const { data: row } = await supabase
        .from('api_keys')
        .select('*')
        .eq('api_key', k)
        .eq('is_active', true)
        .eq('is_owner', true)
        .maybeSingle();
      if (!row) return { ok: false, msg: 'Owner API key invalid or not owner' };
      return { ok: true, row };
    };

    if (action === 'clone_list') {
      const auth = await requireOwner(body.owner_api_key);
      if (!auth.ok) return json({ error: auth.msg }, 403);
      const { data, error } = await supabase
        .from('bot_clones')
        .select('*')
        .eq('owner_api_key', body.owner_api_key)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ clones: data || [] });
    }

    if (action === 'clone_create') {
      const auth = await requireOwner(body.owner_api_key);
      if (!auth.ok) return json({ error: auth.msg }, 403);
      const { name, bot_token, logger_chat_id, assistant_string_session, assistant_name, api_id, api_hash, notes } = body;
      if (!bot_token || !logger_chat_id || !assistant_string_session) {
        return json({ error: 'bot_token, logger_chat_id and assistant_string_session are required' }, 400);
      }
      const { data, error } = await supabase
        .from('bot_clones')
        .insert({
          owner_api_key: body.owner_api_key,
          name: name || 'My Clone',
          bot_token,
          logger_chat_id: String(logger_chat_id),
          assistant_string_session,
          assistant_name: assistant_name || null,
          api_id: api_id ? String(api_id) : null,
          api_hash: api_hash || null,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, clone: data });
    }

    if (action === 'clone_update') {
      const auth = await requireOwner(body.owner_api_key);
      if (!auth.ok) return json({ error: auth.msg }, 403);
      if (!body.clone_id) return json({ error: 'Missing clone_id' }, 400);
      const patch: any = {};
      for (const f of ['name', 'bot_token', 'logger_chat_id', 'assistant_string_session', 'assistant_name', 'api_id', 'api_hash', 'is_active', 'notes']) {
        if (body[f] !== undefined) patch[f] = body[f];
      }
      const { data, error } = await supabase
        .from('bot_clones')
        .update(patch)
        .eq('id', body.clone_id)
        .eq('owner_api_key', body.owner_api_key)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ success: true, clone: data });
    }

    if (action === 'clone_delete') {
      const auth = await requireOwner(body.owner_api_key);
      if (!auth.ok) return json({ error: auth.msg }, 403);
      if (!body.clone_id) return json({ error: 'Missing clone_id' }, 400);
      const { error } = await supabase
        .from('bot_clones')
        .delete()
        .eq('id', body.clone_id)
        .eq('owner_api_key', body.owner_api_key);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    return json({ error: e?.message || 'Server error' }, 500);
  }
});
