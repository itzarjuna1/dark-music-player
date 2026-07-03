import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
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

        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await lovable.auth.signInWithOAuth('google', {
                redirect_uri: window.location.origin,
              });
              if (result.error) throw result.error;
              if (!result.redirected) nav('/community');
            } catch (err: any) {
              toast.error(err?.message ?? 'Google sign-in failed');
            } finally { setBusy(false); }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5 44.5 36.3 44.5 25c0-1.5-.2-3-.5-4.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12.5 24 12.5c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.1 4.5 9.3 8.9 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 45.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.2 41 16 45.5 24 45.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2c-.4.4 6.7-4.9 6.7-14 0-1.5-.2-3-.4-4.4z"/>
          </svg>
          Continue with Google
        </Button>

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
