import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Hash, Trash2 } from 'lucide-react';
import NewRoomDialog from './NewRoomDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export type Room = { id: string; name: string; genre: string | null; is_private: boolean; owner_id: string | null };

export default function RoomsList({
  userId, selectedId, onSelect,
}: { userId: string; selectedId: string | null; onSelect: (r: Room) => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());

  const load = async () => {
    const { data: rs } = await (supabase as any).from('chat_rooms').select('id, name, genre, is_private, owner_id').order('name');
    setRooms(rs || []);
    const { data: mm } = await (supabase as any).from('room_members').select('room_id').eq('user_id', userId);
    setMemberIds(new Set((mm || []).map((r: any) => r.room_id)));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel('rooms-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const join = async (r: Room) => {
    const { error } = await (supabase as any).from('room_members').insert({ room_id: r.id, user_id: userId, role: 'member' });
    if (error && !error.message.includes('duplicate')) return toast.error(error.message);
    onSelect(r);
  };

  const del = async (r: Room, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${r.name}"?`)) return;
    const { error } = await (supabase as any).from('chat_rooms').delete().eq('id', r.id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="p-4 space-y-3 h-full overflow-y-auto">
      <NewRoomDialog userId={userId} onCreated={(id) => { const r = rooms.find((x) => x.id === id); if (r) onSelect(r); }} />
      <div className="space-y-1">
        {rooms.map((r) => {
          const isMember = memberIds.has(r.id);
          const isOwner = r.owner_id === userId;
          return (
            <div
              key={r.id}
              onClick={() => isMember ? onSelect(r) : join(r)}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer smooth-transition',
                selectedId === r.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              )}
            >
              {r.is_private ? <Lock className="w-4 h-4 shrink-0" /> : <Hash className="w-4 h-4 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.name}</p>
                {r.genre && <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{r.genre}</p>}
              </div>
              {!isMember && !r.is_private && <span className="text-[10px] text-muted-foreground">Join</span>}
              {isOwner && (
                <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => del(r, e)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
