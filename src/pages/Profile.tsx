import { User, Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Profile = () => {
  return (
    <div className="flex-1 overflow-y-auto pb-32 p-8">
      <h1 className="text-4xl font-bold mb-8 gradient-text">Profile</h1>

      <div className="max-w-2xl">
        <div className="glass rounded-xl p-8 border border-border hover-glow">
          <div className="flex flex-col items-center mb-8">
            <Avatar className="w-32 h-32 ring-4 ring-primary/30 ring-offset-2 ring-offset-background">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl">
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold mt-4 gradient-text">Guest User</h2>
            <p className="text-muted-foreground text-sm mt-2">Welcome to UpperMoon Tunes</p>
          </div>

          <div className="text-center text-muted-foreground">
            <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Profile settings are available when authentication is enabled.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
