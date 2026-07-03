import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot as BotIcon, Plus, Trash2, Save, MessageSquare, Cpu, Users, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Bot, BotCommand, BotButton, ResponseKind, fetchMyBots, fetchCommands, normalizeUsername } from '@/lib/bots';

export default function BotFather() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => bots.find((b) => b.id === selectedId) || null, [bots, selectedId]);

  const reload = async () => {
    if (!user) return;
    const list = await fetchMyBots(user.id);
    setBots(list);
    if (!selectedId && list.length) setSelectedId(list[0].id);
    if (selectedId && !list.find((b) => b.id === selectedId)) setSelectedId(list[0]?.id ?? null);
  };

  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [user]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-sm p-8 text-center space-y-4">
          <BotIcon className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="font-serif text-2xl">Sign in to use BotFather</h2>
          <p className="text-sm text-muted-foreground">Create and manage bots for your Community rooms.</p>
          <Button onClick={() => nav('/auth')} className="gap-2"><LogIn className="w-4 h-4" />Sign in</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Left: bot list */}
      <aside className="w-72 border-r border-border shrink-0 flex flex-col">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BotIcon className="w-5 h-5" />
            <h2 className="font-serif text-lg">BotFather</h2>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)} className="gap-1"><Plus className="w-4 h-4" />New</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {bots.length === 0 && <p className="text-xs text-muted-foreground p-3">No bots yet. Click <b>New</b> to create one.</p>}
          {bots.map((b) => (
            <button key={b.id} onClick={() => setSelectedId(b.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left ${selectedId === b.id ? 'bg-muted' : ''}`}>
              <Avatar className="w-8 h-8"><AvatarImage src={b.avatar_url ?? undefined} /><AvatarFallback>{b.display_name[0]}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{b.display_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">@{b.username}</p>
              </div>
              <Badge variant={b.bot_type === 'telegram_clone' ? 'default' : 'secondary'} className="text-[9px]">{b.bot_type === 'telegram_clone' ? 'TG' : 'APP'}</Badge>
            </button>
          ))}
        </div>
      </aside>

      {/* Right: editor */}
      <main className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">Select a bot or create one</div>
        ) : (
          <BotEditor bot={selected} onSaved={reload} onDeleted={() => { setSelectedId(null); void reload(); }} />
        )}
      </main>

      <NewBotDialog open={showNew} onOpenChange={setShowNew} onCreated={async (id) => { await reload(); setSelectedId(id); }} userId={user.id} busy={busy} setBusy={setBusy} />
    </div>
  );
}

/* ================= BOT EDITOR ================= */

function BotEditor({ bot, onSaved, onDeleted }: { bot: Bot; onSaved: () => void; onDeleted: () => void }) {
  const [tab, setTab] = useState('profile');
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16"><AvatarImage src={bot.avatar_url ?? undefined} /><AvatarFallback>{bot.display_name[0]}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl truncate">{bot.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{bot.username} · {bot.bot_type === 'telegram_clone' ? 'Telegram clone' : 'In-app bot'}</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile"><Cpu className="w-4 h-4 mr-1" />Profile</TabsTrigger>
          {bot.bot_type === 'in_app' && <TabsTrigger value="commands"><MessageSquare className="w-4 h-4 mr-1" />Commands</TabsTrigger>}
          {bot.bot_type === 'in_app' && <TabsTrigger value="rooms"><Users className="w-4 h-4 mr-1" />Groups</TabsTrigger>}
          <TabsTrigger value="danger">Danger</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab bot={bot} onSaved={onSaved} /></TabsContent>
        <TabsContent value="commands"><CommandsTab bot={bot} /></TabsContent>
        <TabsContent value="rooms"><RoomsTab bot={bot} /></TabsContent>
        <TabsContent value="danger"><DangerTab bot={bot} onDeleted={onDeleted} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({ bot, onSaved }: { bot: Bot; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState(bot.display_name);
  const [description, setDescription] = useState(bot.description ?? '');
  const [avatarUrl, setAvatarUrl] = useState(bot.avatar_url ?? '');
  const [isActive, setIsActive] = useState(bot.is_active);
  const [aiEnabled, setAiEnabled] = useState(bot.ai_enabled);
  const [persona, setPersona] = useState(bot.ai_persona ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(bot.display_name); setDescription(bot.description ?? ''); setAvatarUrl(bot.avatar_url ?? '');
    setIsActive(bot.is_active); setAiEnabled(bot.ai_enabled); setPersona(bot.ai_persona ?? '');
  }, [bot.id]);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from('bots').update({
      display_name: displayName, description: description || null, avatar_url: avatarUrl || null,
      is_active: isActive, ai_enabled: aiEnabled, ai_persona: persona || null,
    }).eq('id', bot.id);
    setSaving(false);
    if (error) toast.error(error.message); else { toast.success('Saved'); onSaved(); }
  };

  return (
    <Card className="p-6 space-y-4">
      <div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
      <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
      <div><Label>Avatar URL</Label><Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" /></div>
      <div className="flex items-center justify-between">
        <div><Label>Active</Label><p className="text-xs text-muted-foreground">Inactive bots won't reply.</p></div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>
      <div className="flex items-center justify-between">
        <div><Label>AI replies</Label><p className="text-xs text-muted-foreground">Reply to any message with AI (uses persona below).</p></div>
        <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
      </div>
      <div><Label>AI persona / system prompt</Label>
        <Textarea value={persona} onChange={(e) => setPersona(e.target.value)} rows={3}
          placeholder="You are a helpful music-loving assistant. Keep replies under 60 words." />
      </div>
      <div className="flex justify-end"><Button onClick={save} disabled={saving} className="gap-2"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save'}</Button></div>
    </Card>
  );
}

/* ---------- Commands ---------- */

function CommandsTab({ bot }: { bot: Bot }) {
  const [cmds, setCmds] = useState<BotCommand[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => { setLoading(true); setCmds(await fetchCommands(bot.id)); setLoading(false); };
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [bot.id]);

  const addNew = async () => {
    const { error } = await (supabase as any).from('bot_commands').insert({
      bot_id: bot.id, command: '/new' + (cmds.length + 1), response_text: 'Hello!', response_kind: 'static', sort_order: cmds.length,
    });
    if (error) toast.error(error.message); else void reload();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Commands</h3>
          <p className="text-xs text-muted-foreground">Users trigger them by typing e.g. <code>/help</code> in a group where the bot is installed.</p>
        </div>
        <Button size="sm" onClick={addNew} className="gap-1"><Plus className="w-4 h-4" />Add command</Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
        cmds.length === 0 ? <p className="text-sm text-muted-foreground">No commands yet.</p> :
        <div className="space-y-3">{cmds.map((c) => <CommandRow key={c.id} cmd={c} onChange={reload} />)}</div>}
    </Card>
  );
}

function CommandRow({ cmd, onChange }: { cmd: BotCommand; onChange: () => void }) {
  const [command, setCommand] = useState(cmd.command);
  const [text, setText] = useState(cmd.response_text ?? '');
  const [kind, setKind] = useState<ResponseKind>(cmd.response_kind);
  const [buttons, setButtons] = useState<BotButton[]>(cmd.buttons ?? []);
  const [dirty, setDirty] = useState(false);

  const markDirty = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setDirty(true); };

  const save = async () => {
    const normalizedCmd = command.startsWith('/') ? command.toLowerCase() : '/' + command.toLowerCase();
    const { error } = await (supabase as any).from('bot_commands').update({
      command: normalizedCmd, response_text: text || null, response_kind: kind,
      buttons: buttons.length ? buttons : null,
    }).eq('id', cmd.id);
    if (error) toast.error(error.message); else { setDirty(false); toast.success('Command saved'); onChange(); }
  };

  const remove = async () => {
    const { error } = await (supabase as any).from('bot_commands').delete().eq('id', cmd.id);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <div className="border border-border rounded-md p-3 space-y-2">
      <div className="flex gap-2 items-start">
        <Input className="w-40 font-mono" value={command} onChange={(e) => markDirty(setCommand)(e.target.value)} />
        <Select value={kind} onValueChange={(v) => markDirty(setKind)(v as ResponseKind)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="static">Static reply</SelectItem>
            <SelectItem value="music_play">Music: /play</SelectItem>
            <SelectItem value="music_queue">Music: /queue</SelectItem>
            <SelectItem value="ai">AI reply</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="outline" onClick={save} disabled={!dirty}><Save className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>
      {kind !== 'ai' && (
        <Textarea value={text} onChange={(e) => markDirty(setText)(e.target.value)} rows={2}
          placeholder={kind === 'static' ? 'Reply text…' : 'Optional description shown before the action'} />
      )}
      <ButtonsEditor buttons={buttons} onChange={(v) => { setButtons(v); setDirty(true); }} />
    </div>
  );
}

function ButtonsEditor({ buttons, onChange }: { buttons: BotButton[]; onChange: (v: BotButton[]) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Inline buttons (optional)</Label>
      <div className="space-y-1">
        {buttons.map((b, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Label" value={b.label} onChange={(e) => { const c = [...buttons]; c[i] = { ...c[i], label: e.target.value }; onChange(c); }} />
            <Input placeholder="Payload (e.g. song name)" value={b.payload} onChange={(e) => { const c = [...buttons]; c[i] = { ...c[i], payload: e.target.value }; onChange(c); }} />
            <Button size="sm" variant="ghost" onClick={() => onChange(buttons.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={() => onChange([...buttons, { label: '', payload: '' }])} className="gap-1"><Plus className="w-4 h-4" />Button</Button>
    </div>
  );
}

/* ---------- Rooms ---------- */

function RoomsTab({ bot }: { bot: Bot }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    const { data: memberships } = await (supabase as any)
      .from('room_members').select('room:room_id(id,name,genre)').eq('user_id', user.id);
    setRooms(((memberships || []) as any[]).map((m) => m.room).filter(Boolean));
    const { data: ins } = await (supabase as any).from('bot_room_installs').select('room_id').eq('bot_id', bot.id);
    setInstalled(new Set(((ins || []) as any[]).map((r) => r.room_id)));
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [bot.id, user?.id]);

  const toggle = async (roomId: string) => {
    if (!user) return;
    if (installed.has(roomId)) {
      const { error } = await (supabase as any).from('bot_room_installs').delete().eq('bot_id', bot.id).eq('room_id', roomId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any).from('bot_room_installs').insert({ bot_id: bot.id, room_id: roomId, installed_by: user.id });
      if (error) return toast.error(error.message + ' (need to be admin/owner)');
    }
    void load();
  };

  return (
    <Card className="p-6 space-y-3">
      <div>
        <h3 className="font-medium">Groups</h3>
        <p className="text-xs text-muted-foreground">Add this bot to Community groups where you are an admin.</p>
      </div>
      {rooms.length === 0 ? <p className="text-sm text-muted-foreground">You aren't in any groups yet.</p> :
        <div className="space-y-1">{rooms.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-2 border border-border rounded-md">
            <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.genre}</p></div>
            <Button size="sm" variant={installed.has(r.id) ? 'secondary' : 'outline'} onClick={() => toggle(r.id)}>
              {installed.has(r.id) ? 'Remove' : 'Add'}
            </Button>
          </div>
        ))}</div>}
    </Card>
  );
}

/* ---------- Danger ---------- */

function DangerTab({ bot, onDeleted }: { bot: Bot; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const del = async () => {
    const { error } = await (supabase as any).from('bots').delete().eq('id', bot.id);
    if (error) return toast.error(error.message);
    toast.success('Bot deleted');
    onDeleted();
  };
  return (
    <Card className="p-6 space-y-3 border-destructive/40">
      <h3 className="font-medium text-destructive">Delete bot</h3>
      <p className="text-xs text-muted-foreground">Permanently removes this bot, its commands, and its group installs.</p>
      <Button variant="destructive" onClick={() => setOpen(true)} className="gap-2"><Trash2 className="w-4 h-4" />Delete @{bot.username}</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete @{bot.username}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={del}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ================= NEW BOT WIZARD ================= */

function NewBotDialog({ open, onOpenChange, onCreated, userId, busy, setBusy }:
  { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (id: string) => void; userId: string; busy: boolean; setBusy: (b: boolean) => void }) {
  const [botType, setBotType] = useState<'in_app' | 'telegram_clone'>('in_app');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  // Telegram-clone specific
  const [tgToken, setTgToken] = useState('');
  const [tgStringSession, setTgStringSession] = useState('');
  const [loggerChatId, setLoggerChatId] = useState('');

  useEffect(() => {
    if (!open) { setDisplayName(''); setUsername(''); setDescription(''); setTgToken(''); setTgStringSession(''); setLoggerChatId(''); setBotType('in_app'); }
  }, [open]);

  const create = async () => {
    const uname = normalizeUsername(username || displayName);
    if (!displayName.trim() || !uname) return toast.error('Name and username required');
    setBusy(true);
    try {
      // 1. Insert bot row
      const { data: bot, error: bErr } = await (supabase as any).from('bots').insert({
        owner_id: userId, username: uname, display_name: displayName.trim(),
        description: description.trim() || null, bot_type: botType,
      }).select().single();
      if (bErr) throw bErr;

      // 2. If telegram clone, also add a bot_clones row + link
      if (botType === 'telegram_clone') {
        if (!tgToken.trim()) throw new Error('Bot token required for Telegram clone');
        const { data: clone, error: cErr } = await (supabase as any).from('bot_clones').insert({
          owner_api_key: userId, // reuse user id as owner key
          name: displayName.trim(),
          bot_token: tgToken.trim(),
          logger_chat_id: loggerChatId.trim() || '0',
          assistant_string_session: tgStringSession.trim() || '',
          assistant_name: displayName.trim(),
          is_active: true,
          notes: `botfather:${uname}`,
        }).select().single();
        if (cErr) throw cErr;
        const { error: lErr } = await (supabase as any).from('bot_telegram_configs').insert({
          bot_id: bot.id, clone_id: clone.id,
        });
        if (lErr) throw lErr;
      } else {
        // Seed a default /start command
        await (supabase as any).from('bot_commands').insert({
          bot_id: bot.id, command: '/start', response_text: `Hello! I'm ${displayName}. Type /help to see what I can do.`, response_kind: 'static', sort_order: 0,
        });
        await (supabase as any).from('bot_commands').insert({
          bot_id: bot.id, command: '/help', response_text: 'I don\'t have many tricks yet — my owner can add commands in BotFather.', response_kind: 'static', sort_order: 1,
        });
      }

      toast.success(`@${uname} created`);
      onCreated(bot.id);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create bot');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New bot</DialogTitle>
          <DialogDescription>Choose the kind of bot to create.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setBotType('in_app')}
              className={`p-3 rounded-md border text-left ${botType === 'in_app' ? 'border-primary bg-muted' : 'border-border'}`}>
              <p className="text-sm font-medium">In-app bot</p>
              <p className="text-xs text-muted-foreground">Lives in Community rooms. Commands, buttons, AI.</p>
            </button>
            <button onClick={() => setBotType('telegram_clone')}
              className={`p-3 rounded-md border text-left ${botType === 'telegram_clone' ? 'border-primary bg-muted' : 'border-border'}`}>
              <p className="text-sm font-medium">Telegram clone</p>
              <p className="text-xs text-muted-foreground">Register your own Telegram bot token to run on the worker.</p>
            </button>
          </div>
          <div><Label>Display name</Label><Input value={displayName} onChange={(e) => { setDisplayName(e.target.value); if (!username) setUsername(normalizeUsername(e.target.value)); }} /></div>
          <div>
            <Label>Username</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input value={username} onChange={(e) => setUsername(normalizeUsername(e.target.value))} className="font-mono" placeholder="mybot" />
            </div>
          </div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>

          {botType === 'telegram_clone' && (
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/40">
              <p className="text-xs text-muted-foreground">Get a bot token from Telegram's <b>@BotFather</b>. String session is optional (needed for voice-chat playback).</p>
              <div><Label>Bot token</Label><Input value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="123456:ABC-…" type="password" /></div>
              <div><Label>Logger chat ID (optional)</Label><Input value={loggerChatId} onChange={(e) => setLoggerChatId(e.target.value)} placeholder="-100…" /></div>
              <div><Label>Assistant string session (optional)</Label><Textarea value={tgStringSession} onChange={(e) => setTgStringSession(e.target.value)} rows={3} placeholder="Pyrogram string session…" /></div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create bot'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
