import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Shield, ShieldOff, UserMinus, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { fetchProfiles, Profile } from '@/lib/profiles';

type Role = 'owner' | 'admin' | 'member';
type Member = { id: string; user_id: string; role: Role };
type BanRow = { id: string; user_id: string; reason: string | null };

export default function MembersPanel({ roomId, currentUserId, myRole }: { roomId: string; currentUserId: string; myRole: Role | null }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const load = async () => {
    const { data: m } = await (supabase as any)
      .from('room_members').select('id, user_id, role').eq('room_id', roomId).order('role');
    setMembers(m || []);
    let banRows: BanRow[] = [];
    if (isAdmin) {
      const { data: b } = await (supabase as any)
        .from('room_bans').select('id, user_id, reason').eq('room_id', roomId);
      banRows = b || [];
      setBans(banRows);
    }
    const ids = [...(m || []).map((x: Member) => x.user_id), ...banRows.map((x) => x.user_id)];
    setProfiles(await fetchProfiles(ids));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`members-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, isAdmin]);

  const setRole = async (m: Member, role: Role) => {
    const { error } = await (supabase as any).from('room_members').update({ role }).eq('id', m.id);
    if (error) toast.error(error.message); else toast.success('Role updated');
  };
  const kick = async (m: Member) => {
    const { error } = await (supabase as any).from('room_members').delete().eq('id', m.id);
    if (error) toast.error(error.message);
  };
  const ban = async (m: Member) => {
    const reason = prompt('Reason for ban?') ?? '';
    await (supabase as any).from('room_members').delete().eq('id', m.id);
    const { error } = await (supabase as any).from('room_bans').insert({
      room_id: roomId, user_id: m.user_id, banned_by: currentUserId, reason: reason || null,
    });
    if (error) toast.error(error.message); else { toast.success('Banned'); load(); }
  };
  const unban = async (b: BanRow) => {
    const { error } = await (supabase as any).from('room_bans').delete().eq('id', b.id);
    if (error) toast.error(error.message); else load();
  };

  const nameOf = (uid: string) => profiles[uid]?.full_name ?? profiles[uid]?.email ?? uid.slice(0, 8);

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Members · {members.length}</h3>
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/40">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profiles[m.user_id]?.avatar_url ?? undefined} />
                <AvatarFallback>{nameOf(m.user_id)[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{nameOf(m.user_id)}</p>
                {m.role !== 'member' && (
                  <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize">{m.role}</Badge>
                )}
              </div>
              {isAdmin && m.user_id !== currentUserId && m.role !== 'owner' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {m.role === 'member' ? (
                      <DropdownMenuItem onClick={() => setRole(m, 'admin')}><Shield className="w-4 h-4 mr-2" /> Promote to admin</DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => setRole(m, 'member')}><ShieldOff className="w-4 h-4 mr-2" /> Demote to member</DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => kick(m)}><UserMinus className="w-4 h-4 mr-2" /> Kick</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => ban(m)}><Ban className="w-4 h-4 mr-2" /> Ban</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      </div>

      {isAdmin && bans.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Banned · {bans.length}</h3>
          <div className="space-y-1">
            {bans.map((b) => (
              <div key={b.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{nameOf(b.user_id)}</p>
                  {b.reason && <p className="text-xs text-muted-foreground truncate">{b.reason}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => unban(b)}>Unban</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
