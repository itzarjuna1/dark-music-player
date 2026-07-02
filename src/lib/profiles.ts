import { supabase } from '@/integrations/supabase/client';

export type Profile = { id: string; full_name: string | null; avatar_url: string | null; email: string };

export async function fetchProfiles(ids: string[]): Promise<Record<string, Profile>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (!unique.length) return {};
  const { data } = await (supabase as any).from('profiles').select('id, full_name, avatar_url, email').in('id', unique);
  const map: Record<string, Profile> = {};
  (data || []).forEach((p: Profile) => { map[p.id] = p; });
  return map;
}
