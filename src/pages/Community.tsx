import { useEffect, useState } from 'react';
import { Users, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import RoomsList, { Room } from '@/components/Community/RoomsList';
import MembersPanel from '@/components/Community/MembersPanel';
import VoiceBar from '@/components/Community/VoiceBar';
import { toast } from 'sonner';
import { fetchProfiles, Profile } from '@/lib/profiles';

type Msg = { id: string; user_id: string; message: string; timestamp: string };

const Community = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState('');
  const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member' | null>(null);

  useEffect(() => {
    if (!room || !user) { setMyRole(null); return; }
    (async () => {
      const { data } = await (supabase as any).from('room_members')
        .select('role').eq('room_id', room.id).eq('user_id', user.id).maybeSingle();
      setMyRole(data?.role ?? null);
    })();
  }, [room, user]);

  useEffect(() => {
    if (!room) { setMessages([]); return; }
    (async () => {
      const { data } = await (supabase as any).from('chat_messages')
        .select('id, user_id, message, timestamp')
        .eq('room_id', room.id).order('timestamp').limit(100);
      const rows = data || [];
      setMessages(rows);
      setProfiles(await fetchProfiles(rows.map((r: Msg) => r.user_id)));
    })();
    const ch = supabase.channel(`msgs-${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` }, async (payload) => {
        const row: any = payload.new;
        setMessages((prev) => [...prev, row]);
        if (!profiles[row.user_id]) {
          const p = await fetchProfiles([row.user_id]);
          setProfiles((prev) => ({ ...prev, ...p }));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const send = async () => {
    if (!text.trim() || !room || !user) return;
    const { error } = await (supabase as any).from('chat_messages').insert({
      room_id: room.id, user_id: user.id, message: text.trim(),
    });
    if (error) toast.error(error.message); else setText('');
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm space-y-4">
          <Users className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="font-serif text-2xl">Sign in to join the community</h2>
          <p className="text-sm text-muted-foreground">Create groups, chat in real time, and hop into voice rooms with other listeners.</p>
          <Button onClick={() => nav('/auth')}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* Rooms */}
      <div className="w-64 border-r border-border shrink-0 hidden md:block">
        <RoomsList userId={user.id} selectedId={room?.id ?? null} onSelect={setRoom} />
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {!room ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Pick a group to start chatting</div>
        ) : (
          <>
            <div className="p-3 border-b border-border">
              <h2 className="font-serif text-lg">{room.name}</h2>
              {room.genre && <p className="text-xs text-muted-foreground">{room.genre}</p>}
            </div>
            <VoiceBar roomId={room.id} userId={user.id} />
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="flex gap-2">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                      <AvatarFallback>{(m.profile?.full_name ?? m.profile?.email ?? '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-medium">{m.profile?.full_name ?? m.profile?.email ?? 'User'}</p>
                        <span className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm break-words">{m.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border flex gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && send()}
                     placeholder={myRole ? 'Message…' : 'Join to send messages'}
                     disabled={!myRole} />
              <Button onClick={send} disabled={!myRole || !text.trim()}><Send className="w-4 h-4" /></Button>
            </div>
          </>
        )}
      </div>

      {/* Members */}
      <div className="w-72 border-l border-border shrink-0 hidden lg:block">
        {room ? (
          <MembersPanel roomId={room.id} currentUserId={user.id} myRole={myRole} />
        ) : (
          <div className="p-4 text-sm text-muted-foreground">Members appear here.</div>
        )}
      </div>
    </div>
  );
};

export default Community;
