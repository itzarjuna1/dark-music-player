import { useState, useEffect } from 'react';
import { Users, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface ChatRoom {
  id: string;
  name: string;
  genre: string | null;
  description: string | null;
}

interface Message {
  id: string;
  user_id: string;
  message: string;
  timestamp: string;
}

interface Activity {
  id: string;
  user_id: string;
  track_title: string;
  track_artist: string;
  track_cover: string;
  action: string;
  timestamp: string;
}

const Community = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
    loadActivities();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      subscribeToMessages(selectedRoom.id);
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('chat_rooms')
        .select('*')
        .order('name');

      if (error) throw error;
      setRooms(data || []);
      if (data && data.length > 0) {
        setSelectedRoom(data[0]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_activity')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel('messages-' + roomId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedRoom) return;

    try {
      const { error } = await (supabase as any).from('chat_messages').insert({
        room_id: selectedRoom.id,
        user_id: user.id,
        message: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-6 animate-fade-in">
      <div className="max-w-7xl mx-auto h-full flex gap-6">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-2xl font-bold gradient-text">Community Chat</h2>
            <p className="text-sm text-muted-foreground">Connect with music lovers</p>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Room List */}
            <div className="w-64 border-r border-border p-4 space-y-2 overflow-y-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left p-3 rounded-lg smooth-transition hover-glow ${
                    selectedRoom?.id === room.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card hover:bg-accent'
                  }`}
                >
                  <p className="font-semibold">{room.name}</p>
                  <p className="text-xs opacity-70">{room.genre}</p>
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.user_id === user?.id
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-card'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-border flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 glass"
                />
                <Button onClick={sendMessage} className="hover-glow">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="w-80 glass rounded-xl p-4 overflow-hidden flex flex-col">
          <h3 className="text-xl font-bold mb-4 gradient-text">Recent Activity</h3>
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-card hover-glow">
                  <img
                    src={activity.track_cover}
                    alt={activity.track_title}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{activity.track_title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.track_artist}
                    </p>
                    <p className="text-xs text-primary capitalize">{activity.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default Community;
