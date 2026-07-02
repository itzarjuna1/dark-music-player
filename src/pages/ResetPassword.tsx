import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const ResetPassword = () => {
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Password updated.');
    nav('/community');
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card/95 backdrop-blur">
        <h1 className="font-serif text-2xl">Set a new password</h1>
        <form onSubmit={submit} className="space-y-3">
          <Input type="password" placeholder="New password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button className="w-full" disabled={busy}>{busy ? '…' : 'Update password'}</Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
