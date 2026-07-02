import { Mic, MicOff, PhoneOff, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useVoiceRoom } from '@/hooks/useVoiceRoom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Participant = { user_id: string; is_muted: boolean; profile?: { full_name: string | null; avatar_url: string | null } };

export default function VoiceBar({ roomId, userId }: { roomId: string; userId: string }) {
  const { connected, muted, join, leave, toggleMute } = useVoiceRoom(roomId, userId);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from('voice_participants')
      .select('user_id, is_muted, profile:profiles!voice_participants_user_id_fkey(full_name, avatar_url)')
      .eq('room_id', roomId);
    setParticipants(data || []);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`voice-bar-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_participants', filter: `room_id=eq.${roomId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleJoin = async () => {
    try { await join(); } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="flex items-center gap-3 p-3 border-b border-border bg-card/50">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {participants.length === 0 ? (
          <span className="text-xs text-muted-foreground">No one is in voice chat</span>
        ) : (
          <div className="flex -space-x-2">
            {participants.slice(0, 8).map((p) => (
              <div key={p.user_id} className="relative">
                <Avatar className="w-8 h-8 border-2 border-background">
                  <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                  <AvatarFallback>{(p.profile?.full_name ?? '?')[0]}</AvatarFallback>
                </Avatar>
                {p.is_muted && <MicOff className="w-3 h-3 absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />}
              </div>
            ))}
            {participants.length > 8 && <span className="text-xs text-muted-foreground ml-3 self-center">+{participants.length - 8}</span>}
          </div>
        )}
      </div>
      {connected ? (
        <>
          <Button size="sm" variant={muted ? 'secondary' : 'outline'} onClick={toggleMute}>
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="destructive" onClick={leave}>
            <PhoneOff className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={handleJoin} className="gap-2">
          <Phone className="w-4 h-4" /> Join voice
        </Button>
      )}
    </div>
  );
}
