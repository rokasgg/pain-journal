import { useEffect } from 'react';

import { useReminderSettings } from '@/hooks/useReminderSettings';
import { syncReminderNotifications } from '@/utils/notifications';

export function useSyncReminderNotifications() {
  const { settings, isLoading } = useReminderSettings();

  useEffect(() => {
    if (isLoading) return;
    syncReminderNotifications(settings);
  }, [settings, isLoading]);
}
