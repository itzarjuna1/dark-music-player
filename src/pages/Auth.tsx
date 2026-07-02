import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const Auth = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav('/community'); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/community`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success('Account created — check your email to confirm.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in.');
        nav('/community');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Auth failed');
    } finally { setBusy(false); }
  };

  const forgot = async () => {
    if (!email) return toast.error('Enter your email first');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message); else toast.success('Reset email sent.');
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card/95 backdrop-blur">
        <div>
          <h1 className="font-serif text-3xl">UpperMoon Tunes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signin' ? 'Sign in to join the community' : 'Create your account'}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <Input placeholder="Display name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
        <div className="flex justify-between text-sm">
          <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
            {mode === 'signin' ? 'Need an account?' : 'Have an account?'}
          </button>
          {mode === 'signin' && (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={forgot}>Forgot?</button>
          )}
        </div>
        <button type="button" onClick={() => nav('/')} className="w-full text-xs text-muted-foreground hover:text-foreground">
          Continue as guest
        </button>
      </Card>
    </div>
  );
};

export default Auth;
