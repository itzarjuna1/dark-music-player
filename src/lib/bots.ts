import { supabase } from '@/integrations/supabase/client';

export type Bot = {
  id: string;
  owner_id: string;
  username: string;
  display_name: string;
  description: string | null;
  avatar_url: string | null;
  bot_type: 'in_app' | 'telegram_clone';
  is_active: boolean;
  ai_enabled: boolean;
  ai_persona: string | null;
  created_at: string;
  updated_at: string;
};

export type ResponseKind = 'static' | 'music_play' | 'music_queue' | 'ai';

export type BotButton = { label: string; payload: string };

export type BotCommand = {
  id: string;
  bot_id: string;
  command: string;
  response_text: string | null;
  response_kind: ResponseKind;
  buttons: BotButton[] | null;
  sort_order: number;
};

export async function fetchMyBots(userId: string): Promise<Bot[]> {
  const { data } = await (supabase as any).from('bots').select('*').eq('owner_id', userId).order('created_at', { ascending: false });
  return (data || []) as Bot[];
}

export async function fetchBot(id: string): Promise<Bot | null> {
  const { data } = await (supabase as any).from('bots').select('*').eq('id', id).maybeSingle();
  return (data as Bot) || null;
}

export async function fetchBotByIds(ids: string[]): Promise<Record<string, Bot>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (!unique.length) return {};
  const { data } = await (supabase as any).from('bots').select('*').in('id', unique);
  const map: Record<string, Bot> = {};
  (data || []).forEach((b: Bot) => { map[b.id] = b; });
  return map;
}

export async function fetchCommands(botId: string): Promise<BotCommand[]> {
  const { data } = await (supabase as any).from('bot_commands').select('*').eq('bot_id', botId).order('sort_order');
  return (data || []) as BotCommand[];
}

export async function fetchInstalledBots(roomId: string): Promise<Bot[]> {
  const { data } = await (supabase as any)
    .from('bot_room_installs')
    .select('bot_id, bots:bot_id(*)')
    .eq('room_id', roomId);
  return ((data || []) as any[]).map((r) => r.bots).filter(Boolean);
}

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32);
}
