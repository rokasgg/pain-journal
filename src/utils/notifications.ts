import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

import { t } from '@/lib/i18n/useTranslation';
import type { ReminderSettings } from '@/types/database.types';

const MORNING_REMINDER_ID = 'morning-reminder';
const EVENING_REMINDER_ID = 'evening-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Check-in Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export async function syncReminderNotifications(settings: ReminderSettings | null): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MORNING_REMINDER_ID);
  await Notifications.cancelScheduledNotificationAsync(EVENING_REMINDER_ID);

  if (!settings?.push_enabled) return;

  await ensureAndroidChannel();

  const morning = parseTime(settings.morning_time);
  const evening = parseTime(settings.evening_time);

  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_REMINDER_ID,
    content: {
      title: t('notifications.morningTitle'),
      body: t('notifications.morningBody'),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      hour: morning.hour,
      minute: morning.minute,
      repeats: true,
    },
  });

  await Notifications.scheduleNotificationAsync({
    identifier: EVENING_REMINDER_ID,
    content: {
      title: t('notifications.eveningTitle'),
      body: t('notifications.eveningBody'),
    },
    trigger: {
      type: SchedulableTriggerInputTypes.CALENDAR,
      hour: evening.hour,
      minute: evening.minute,
      repeats: true,
    },
  });
}
