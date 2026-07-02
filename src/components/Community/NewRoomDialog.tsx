import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function NewRoomDialog({ userId, onCreated }: { userId: string; onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await (supabase as any).from('chat_rooms').insert({
      name: name.trim(), genre: genre.trim() || null, description: description.trim() || null,
      is_private: isPrivate, owner_id: userId,
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Group created');
    setOpen(false); setName(''); setGenre(''); setDescription(''); setIsPrivate(false);
    onCreated(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full gap-2"><Plus className="w-4 h-4" /> New group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a group</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          <Input placeholder="Genre (optional)" value={genre} onChange={(e) => setGenre(e.target.value)} maxLength={40} />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={280} />
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label>Private</Label>
              <p className="text-xs text-muted-foreground">Only invited members can see this group.</p>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <Button className="w-full" disabled={busy || !name.trim()}>Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
