import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/hooks/useSession';
import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';
import type { ReminderSettings, ReminderSettingsUpsert } from '@/types/database.types';

export function useReminderSettings() {
  const { user } = useSession();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['reminderSettings', user?.id],
    queryFn: async (): Promise<ReminderSettings | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as ReminderSettings | null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { settings: settings ?? null, isLoading };
}

export function useUpdateReminderSettings() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updates: Omit<ReminderSettingsUpsert, 'user_id'>,
    ): Promise<{ error: string | null }> => {
      if (!user) return { error: t('common.notSignedIn') };

      const { error } = await supabase
        .from('reminder_settings')
        .upsert({ ...updates, user_id: user.id }, { onConflict: 'user_id' });

      return { error: error?.message ?? null };
    },
    onSuccess: (result) => {
      if (!result.error) {
        queryClient.invalidateQueries({ queryKey: ['reminderSettings', user?.id] });
      }
    },
  });
}
