import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

type Reason = 'NotAllowedError' | 'PermissionDeniedError' | 'NotFoundError' | 'NotReadableError' | 'MicError' | string;

const detectBrowser = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/edg/i.test(ua)) return 'edge';
  if (/chrome/i.test(ua)) return 'chrome';
  if (/firefox/i.test(ua)) return 'firefox';
  if (/safari/i.test(ua)) return 'safari';
  return 'other';
};

const hintFor = (browser: string) => {
  switch (browser) {
    case 'chrome':
    case 'edge':
      return 'Click the lock icon in the address bar → Site settings → Microphone → Allow, then reload.';
    case 'firefox':
      return 'Click the shield/lock icon in the address bar → Permissions → Use the Microphone → Allow.';
    case 'safari':
      return 'Safari → Settings for This Website → Microphone → Allow, then reload.';
    default:
      return 'Open your browser site settings for this page and set Microphone to Allow.';
  }
};

export function MicPermissionDialog({
  open, reason, onRetry, onClose,
}: { open: boolean; reason: Reason | null; onRetry: () => void; onClose: () => void }) {
  const isDenied = reason === 'NotAllowedError' || reason === 'PermissionDeniedError';
  const isMissing = reason === 'NotFoundError';
  const isBusy = reason === 'NotReadableError';

  const title = isDenied ? 'Microphone access blocked'
    : isMissing ? 'No microphone found'
    : isBusy ? 'Microphone is in use'
    : 'Couldn\'t start microphone';

  const body = isDenied
    ? hintFor(detectBrowser())
    : isMissing
      ? 'Connect a microphone (or headset) and try again.'
      : isBusy
        ? 'Another app or browser tab is using your microphone. Close it and try again.'
        : 'An unexpected error occurred while starting your microphone. Try again.';

  const Icon = isDenied ? MicOff : isMissing ? Mic : AlertCircle;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
            <Icon className="w-6 h-6" />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-2 leading-relaxed">{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onRetry}>Try again</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
