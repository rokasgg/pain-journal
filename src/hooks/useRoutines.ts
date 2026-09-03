import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { supabase } from '@/lib/supabase';
import type { Routine } from '@/types/database.types';

// A user has at most one is_active routine at a time (enforced by a DB
// trigger — see supabase_routines_migration.sql), so this is a maybeSingle,
// not a list query.
export function useActiveRoutine() {
  const { user } = useSession();

  const { data: routine, isLoading } = useQuery({
    queryKey: ['routines', 'active', user?.id],
    queryFn: async (): Promise<Routine | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as Routine | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { routine: routine ?? null, isLoading };
}
