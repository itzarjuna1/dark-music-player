import { useEffect, useState } from 'react';
import { Code, Copy, Check, Key, Crown, Shield, Zap, Calendar, MessageCircle, Trash2, ExternalLink, Bot, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  plan: string;
  is_owner: boolean;
  is_active: boolean;
  monthly_quota: number;
  requests_used: number;
  expires_at: string | null;
  created_at: string;
}

const PLANS = [
  { id: 'free', label: 'Free Trial', price: 'Free · 7 days', quota: '100 requests', icon: Zap, color: 'text-muted-foreground' },
  { id: 'month', label: '1 Month', price: '₹200', quota: '50,000 requests', icon: Calendar, color: 'text-primary' },
  { id: 'six_months', label: '6 Months', price: '₹1,200', quota: '500,000 requests · Save ₹0', icon: Calendar, color: 'text-primary' },
  { id: 'year', label: '1 Year', price: '₹2,000', quota: '1.5M requests · Best value', icon: Calendar, color: 'text-primary' },
  { id: 'owner', label: 'Owner / Admin', price: 'Free (with master pass)', quota: 'Unlimited', icon: Crown, color: 'text-yellow-500' },
];

const SUPPORT_LINK = 'https://t.me/theinfinity_support';

export default function DeveloperPortal() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openResult, setOpenResult] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string>('');

  const [planChoice, setPlanChoice] = useState('free');
  const [keyName, setKeyName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [creating, setCreating] = useState(false);

  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID || '';
  const apiBase = `https://${projectId}.supabase.co/functions/v1/bot-api`;

  const loadKeys = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setKeys(data as ApiKey[]);
    setLoading(false);
  };

  useEffect(() => { loadKeys(); }, []);

  const copy = (val: string, field: string) => {
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    toast.success('Copied!');
    setTimeout(() => setCopiedField(''), 1500);
  };

  const createKey = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-key-manager', {
        body: {
          action: 'create',
          plan: planChoice,
          name: keyName || undefined,
          contact_info: contactInfo || undefined,
          owner_pass: planChoice === 'owner' ? ownerPass : undefined,
        },
      });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || 'Failed to create');
        return;
      }
      setResultData(data);
      setOpenCreate(false);
      setOpenResult(true);
      setKeyName(''); setContactInfo(''); setOwnerPass(''); setPlanChoice('free');
      loadKeys();
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Disable this API key? This cannot be undone.')) return;
    const { error } = await supabase.functions.invoke('api-key-manager', {
      body: { action: 'revoke', key_id: id },
    });
    if (error) toast.error(error.message);
    else { toast.success('Key disabled'); loadKeys(); }
  };

  const maskKey = (k: string) => k.slice(0, 8) + '••••••••' + k.slice(-4);

  return (
    <div className="flex-1 overflow-y-auto pb-32 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Code className="w-8 h-8 text-primary" />
            <h1 className="text-3xl sm:text-4xl font-bold">Developer Portal</h1>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Connect your Telegram music bot to UpperMoon Tunes. Get an API key and search YouTube music & shorts — clean metadata, no yt-dlp on our side.
          </p>
        </div>

        {/* Pricing */}
        <Card className="p-4 sm:p-6 mb-6 bg-card/50 backdrop-blur">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" /> Plans & Pricing
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PLANS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="rounded-lg border border-border p-3 bg-background/50 flex flex-col">
                  <Icon className={`w-5 h-5 mb-2 ${p.color}`} />
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className="text-base font-bold">{p.price}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.quota}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <Button onClick={() => setOpenCreate(true)} className="gap-2">
              <Key className="w-4 h-4" /> Generate API Key
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href={SUPPORT_LINK} target="_blank" rel="noreferrer">
                <MessageCircle className="w-4 h-4" /> Discount? Contact support
              </a>
            </Button>
          </div>
        </Card>

        {/* API endpoint info */}
        <Card className="p-4 sm:p-6 mb-6 bg-card/50 backdrop-blur">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> API Endpoint
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded font-mono text-xs sm:text-sm break-all">
              <span className="flex-1">{apiBase}</span>
              <Button size="sm" variant="ghost" onClick={() => copy(apiBase, 'base')}>
                {copiedField === 'base' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <details className="text-xs sm:text-sm text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">Available endpoints</summary>
              <ul className="mt-2 space-y-1 pl-4 font-mono">
                <li>GET <code>/search?q=&lt;query&gt;&amp;limit=10</code> — music search</li>
                <li>GET <code>/shorts?q=&lt;query&gt;&amp;limit=10</code> — shorts search (≤60s)</li>
                <li>GET <code>/nowplaying</code> — current track + progress bar</li>
                <li>POST <code>/nowplaying</code> — bot/player updates current track</li>
              </ul>
              <p className="mt-2">Auth: <code>X-API-Key: &lt;your-key&gt;</code></p>
              <p className="mt-1">Stream extraction (yt-dlp / Kartik API / etc.) runs on your bot side — we only return clean metadata + video IDs.</p>
            </details>
          </div>
        </Card>

        {/* Keys list */}
        <Card className="p-4 sm:p-6 bg-card/50 backdrop-blur">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Your API Keys</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-muted-foreground text-sm">No keys yet — generate one to get started.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="rounded-lg border border-border p-3 flex flex-col sm:flex-row sm:items-center gap-2 bg-background/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{k.name}</span>
                      {k.is_owner && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Owner</Badge>}
                      <Badge variant="outline" className="text-xs">{k.plan}</Badge>
                      {!k.is_active && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 break-all">{maskKey(k.api_key)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {k.is_owner ? 'Unlimited' : `${k.requests_used.toLocaleString()} / ${k.monthly_quota.toLocaleString()} requests`}
                      {k.expires_at && ` · expires ${new Date(k.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => copy(k.api_key, k.id)} title="Copy full key">
                      {copiedField === k.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    {k.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => revokeKey(k.id)} title="Disable">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Private: Bot Clones (owner only) */}
        <CloneManager keys={keys} apiBase={apiBase} />
      </div>


      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              For paid plans, complete payment via Telegram support, then choose the plan here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Key name</label>
              <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="My bot" />
            </div>
            <div>
              <label className="text-sm font-medium">Plan</label>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {PLANS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanChoice(p.id)}
                    className={`text-left p-3 rounded-lg border smooth-transition ${
                      planChoice === p.id ? 'border-primary bg-primary/10' : 'border-border bg-background/50 hover:bg-background'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-sm">{p.label}</span>
                      <span className="text-sm font-bold">{p.price}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{p.quota}</div>
                  </button>
                ))}
              </div>
            </div>
            {planChoice === 'owner' && (
              <div>
                <label className="text-sm font-medium">Owner master pass</label>
                <Input type="password" value={ownerPass} onChange={(e) => setOwnerPass(e.target.value)} placeholder="••••••••" />
                <p className="text-xs text-muted-foreground mt-1">Required for free unlimited owner key.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Contact (Telegram username, optional)</label>
              <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="@username" />
            </div>
            {(planChoice === 'month' || planChoice === 'six_months' || planChoice === 'year') && (
              <div className="text-xs bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                💳 After payment via <a href={SUPPORT_LINK} target="_blank" rel="noreferrer" className="underline">{SUPPORT_LINK}</a>, generate the key here. Admins will activate it.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancel</Button>
            <Button onClick={createKey} disabled={creating}>
              {creating ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={openResult} onOpenChange={setOpenResult}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✓ API Key Created</DialogTitle>
            <DialogDescription>Save these credentials — the full key is only shown once here.</DialogDescription>
          </DialogHeader>
          {resultData && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground">API Key</div>
                <div className="flex items-center gap-1 bg-muted/50 p-2 rounded font-mono text-xs break-all">
                  <span className="flex-1">{resultData.api_key}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(resultData.api_key, 'rk')}>
                    {copiedField === 'rk' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">API URL</div>
                <div className="flex items-center gap-1 bg-muted/50 p-2 rounded font-mono text-xs break-all">
                  <span className="flex-1">{resultData.api_url}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(resultData.api_url, 'ru')}>
                    {copiedField === 'ru' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">cURL example</div>
                <div className="bg-muted/50 p-2 rounded font-mono text-[10px] break-all">{resultData.usage_example}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setOpenResult(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Private Bot Clone Manager — only works with an OWNER api key
// ============================================================
interface Clone {
  id: string;
  name: string;
  bot_token: string;
  logger_chat_id: string;
  assistant_string_session: string;
  assistant_name: string | null;
  api_id: string | null;
  api_hash: string | null;
  is_active: boolean;
  last_heartbeat: string | null;
  notes: string | null;
  created_at: string;
}

function CloneManager({ keys, apiBase }: { keys: ApiKey[]; apiBase: string }) {
  const ownerKeys = keys.filter((k) => k.is_owner && k.is_active);
  const [selectedKey, setSelectedKey] = useState<string>(
    () => localStorage.getItem('um_owner_key') || ownerKeys[0]?.api_key || ''
  );
  const [clones, setClones] = useState<Clone[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState<string>('');

  const [form, setForm] = useState({
    name: '',
    bot_token: '',
    logger_chat_id: '',
    assistant_string_session: '',
    assistant_name: '',
    api_id: '',
    api_hash: '',
    notes: '',
  });

  useEffect(() => {
    if (!selectedKey && ownerKeys[0]) setSelectedKey(ownerKeys[0].api_key);
  }, [ownerKeys, selectedKey]);

  useEffect(() => {
    if (selectedKey) {
      localStorage.setItem('um_owner_key', selectedKey);
      loadClones();
    }
  }, [selectedKey]);

  const loadClones = async () => {
    if (!selectedKey) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('api-key-manager', {
      body: { action: 'clone_list', owner_api_key: selectedKey },
    });
    if (error || data?.error) toast.error(data?.error || error?.message || 'Load failed');
    else setClones(data.clones || []);
    setLoading(false);
  };

  const createClone = async () => {
    if (!form.bot_token || !form.logger_chat_id || !form.assistant_string_session) {
      toast.error('Bot token, logger chat id and string session are required');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('api-key-manager', {
      body: { action: 'clone_create', owner_api_key: selectedKey, ...form },
    });
    setSaving(false);
    if (error || data?.error) return toast.error(data?.error || error?.message || 'Failed');
    toast.success('Clone saved — your bot can now fetch it from /clones');
    setOpen(false);
    setForm({ name: '', bot_token: '', logger_chat_id: '', assistant_string_session: '', assistant_name: '', api_id: '', api_hash: '', notes: '' });
    loadClones();
  };

  const deleteClone = async (id: string) => {
    if (!confirm('Delete this clone? Bot will stop spawning it on next poll.')) return;
    const { error } = await supabase.functions.invoke('api-key-manager', {
      body: { action: 'clone_delete', owner_api_key: selectedKey, clone_id: id },
    });
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); loadClones(); }
  };

  const toggleActive = async (c: Clone) => {
    const { error } = await supabase.functions.invoke('api-key-manager', {
      body: { action: 'clone_update', owner_api_key: selectedKey, clone_id: c.id, is_active: !c.is_active },
    });
    if (error) toast.error(error.message);
    else loadClones();
  };

  const mask = (s: string) => (s ? s.slice(0, 6) + '••••••' + s.slice(-4) : '');

  if (ownerKeys.length === 0) {
    return (
      <Card className="p-4 sm:p-6 mt-6 bg-card/50 backdrop-blur border-yellow-500/30">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Private: Bot Clone Hosting</h2>
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Owner only</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate an <strong>Owner</strong> API key above (using your master pass) to manage VC bot clones here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 mt-6 bg-card/50 backdrop-blur border-yellow-500/30">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <Bot className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg sm:text-xl font-semibold">Private: Bot Clone Hosting</h2>
        <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Owner only</Badge>
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        Save Telegram VC music bot configs (bot token + logger id + assistant string session). Your hoster bot polls{' '}
        <code className="font-mono bg-muted px-1 rounded">{apiBase}/clones</code> with your owner key and spawns each clone via Pyrogram + PyTgCalls on your VPS.
      </p>

      {ownerKeys.length > 1 && (
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground">Owner key</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full mt-1 bg-background border border-border rounded p-2 text-sm"
          >
            {ownerKeys.map((k) => (
              <option key={k.id} value={k.api_key}>{k.name} — {mask(k.api_key)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Clone
        </Button>
        <Button onClick={loadClones} size="sm" variant="outline" className="gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : clones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clones yet. Add one to host a VC music bot.</p>
      ) : (
        <div className="space-y-2">
          {clones.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-3 bg-background/50">
              <div className="flex items-start gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.name}</span>
                    {c.assistant_name && <Badge variant="outline" className="text-xs">{c.assistant_name}</Badge>}
                    {!c.is_active && <Badge variant="destructive" className="text-xs">Disabled</Badge>}
                    {c.last_heartbeat && (
                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                        ● live {new Date(c.last_heartbeat).toLocaleTimeString()}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5 font-mono break-all">
                    <div>token: {showSecret === c.id ? c.bot_token : mask(c.bot_token)}</div>
                    <div>logger: {c.logger_chat_id}</div>
                    <div>session: {showSecret === c.id ? c.assistant_string_session : mask(c.assistant_string_session)}</div>
                  </div>
                  {c.notes && <p className="text-xs text-muted-foreground mt-1 italic">{c.notes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setShowSecret(showSecret === c.id ? '' : c.id)}>
                    {showSecret === c.id ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                    {c.is_active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteClone(c.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">How your hoster bot consumes this</summary>
        <pre className="mt-2 bg-muted/50 p-2 rounded overflow-x-auto text-[10px]">
{`# On your VPS, every N seconds:
GET ${apiBase}/clones
Header: X-API-Key: <YOUR_OWNER_KEY>

# Response:
{ "clones": [{ "id":"...", "bot_token":"...", "assistant_string_session":"...",
               "logger_chat_id":"...", "api_id":"...", "api_hash":"..." }] }

# For each clone -> spawn Pyrogram Client + PyTgCalls
# When /play <q> hits a clone, fetch song from:
GET ${apiBase}/play?q=<query>
# -> returns { track, stream_url }
# Then pipe stream_url through yt-dlp -> ffmpeg -> PyTgCalls

# Optional heartbeat so the dashboard shows "live":
POST ${apiBase}/clones  body: { "heartbeat": true, "clone_id": "..." }`}
        </pre>
      </details>

      {/* Add clone dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Bot Clone</DialogTitle>
            <DialogDescription>Stored encrypted at rest. Only your owner key can read these.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Clone name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="UpperMoon Music Bot" />
            </div>
            <div>
              <label className="text-sm font-medium">Bot token *</label>
              <Input value={form.bot_token} onChange={(e) => setForm({ ...form, bot_token: e.target.value })} placeholder="123456:ABC..." />
              <p className="text-[10px] text-muted-foreground mt-1">From @BotFather</p>
            </div>
            <div>
              <label className="text-sm font-medium">Logger chat id *</label>
              <Input value={form.logger_chat_id} onChange={(e) => setForm({ ...form, logger_chat_id: e.target.value })} placeholder="-1001234567890" />
            </div>
            <div>
              <label className="text-sm font-medium">Assistant string session *</label>
              <Input value={form.assistant_string_session} onChange={(e) => setForm({ ...form, assistant_string_session: e.target.value })} placeholder="Pyrogram/Telethon session string" />
              <p className="text-[10px] text-muted-foreground mt-1">Userbot session — joins VC and streams audio</p>
            </div>
            <div>
              <label className="text-sm font-medium">Assistant name</label>
              <Input value={form.assistant_name} onChange={(e) => setForm({ ...form, assistant_name: e.target.value })} placeholder="@my_assistant" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">API ID</label>
                <Input value={form.api_id} onChange={(e) => setForm({ ...form, api_id: e.target.value })} placeholder="12345" />
              </div>
              <div>
                <label className="text-sm font-medium">API Hash</label>
                <Input value={form.api_hash} onChange={(e) => setForm({ ...form, api_hash: e.target.value })} placeholder="abc123..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createClone} disabled={saving}>{saving ? 'Saving…' : 'Save Clone'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
