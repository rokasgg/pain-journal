import { useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, useColorScheme, View } from 'react-native';

import { NotificationPreview } from '@/components/settings/NotificationPreview';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsTimeRow } from '@/components/settings/SettingsTimeRow';
import { useReminderSettings, useUpdateReminderSettings } from '@/hooks/useReminderSettings';
import { EVENING_UNLOCK_HOUR } from '@/lib/checkinTiming';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { hourToTime } from '@/lib/time';
import type { ReminderSettings } from '@/types/database.types';
import { haptics } from '@/utils/haptics';
import { requestNotificationPermission } from '@/utils/notifications';
import { toast } from '@/utils/toast';

const DEFAULT_MORNING = '08:00';
const DEFAULT_EVENING = '21:00';
// Evening reminders can't fire before the evening check-in opens; morning
// reminders stay before it.
const EVENING_MIN = hourToTime(EVENING_UNLOCK_HOUR);
const MORNING_MAX = `${String(EVENING_UNLOCK_HOUR - 1).padStart(2, '0')}:59`;

type ReminderKind = 'morning' | 'evening';

interface ReminderState {
  pushEnabled: boolean;
  morningTime: string;
  eveningTime: string;
}

function NotificationsForm({ settings }: { settings: ReminderSettings | null }) {
  const { t } = useTranslation();
  // Switch track colours are native props (sanctioned exception, see Settings).
  const isDark = useColorScheme() === 'dark';
  const updateReminderSettings = useUpdateReminderSettings();
  const [state, setState] = useState<ReminderState>({
    pushEnabled: settings?.push_enabled ?? true,
    morningTime: settings?.morning_time ?? DEFAULT_MORNING,
    eveningTime: settings?.evening_time ?? DEFAULT_EVENING,
  });
  // The preview follows whichever reminder the user last touched.
  const [previewKind, setPreviewKind] = useState<ReminderKind>('morning');

  // Auto-save (no Save button, per the design): optimistic local update,
  // reverted if the upsert fails. Root useSyncReminderNotifications()
  // reschedules from the saved settings.
  const save = async (next: ReminderState) => {
    const previous = state;
    setState(next);
    const { error } = await updateReminderSettings.mutateAsync({
      push_enabled: next.pushEnabled,
      morning_time: next.morningTime,
      evening_time: next.eveningTime,
    });
    if (error) {
      setState(previous);
      toast.error(error);
    }
  };

  const handleToggle = async (value: boolean) => {
    haptics.tick();
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error(t('settings.notificationPermissionDenied'));
        return;
      }
    }
    await save({ ...state, pushEnabled: value });
  };

  const previewTime = previewKind === 'morning' ? state.morningTime : state.eveningTime;

  return (
    <View className="gap-7">
      <SettingsSection>
        <SettingsRow
          icon="notifications-outline"
          title={t('settings.remindersTitle')}
          subtitle={t('settings.remindersSubtitle')}
          accessory={
            <Switch
              value={state.pushEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.gray, true: isDark ? colors.primaryDark : colors.primary }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.gray}
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title={t('settings.remindMeAt')}
        footer={t('settings.eveningReminderHint', { time: EVENING_MIN })}
      >
        <SettingsTimeRow
          icon="sunny-outline"
          title={t('home.morning')}
          iconTileClassName="bg-amber-100 dark:bg-amber-950"
          iconColor="#d97706"
          value={state.morningTime}
          maximumTime={MORNING_MAX}
          disabled={!state.pushEnabled}
          onOpen={() => setPreviewKind('morning')}
          onChange={(time) => save({ ...state, morningTime: time })}
        />
        <SettingsTimeRow
          icon="moon-outline"
          title={t('home.evening')}
          iconTileClassName="bg-indigo-100 dark:bg-indigo-950"
          iconColor="#4f46e5"
          value={state.eveningTime}
          minimumTime={EVENING_MIN}
          disabled={!state.pushEnabled}
          onOpen={() => setPreviewKind('evening')}
          onChange={(time) => save({ ...state, eveningTime: time })}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.preview')} bare>
        <NotificationPreview
          appName={t('settings.appName')}
          time={previewTime}
          title={t(previewKind === 'morning' ? 'notifications.morningTitle' : 'notifications.eveningTitle')}
          body={t(previewKind === 'morning' ? 'notifications.morningBody' : 'notifications.eveningBody')}
          dimmed={!state.pushEnabled}
        />
      </SettingsSection>
    </View>
  );
}

// Settings → Notifications (design from assets/possible-app-design/notifications).
// A pushed page, not a modal sheet — the first of the settings sub-pages
// moving to this design (src/app/settings/).
export default function NotificationsScreen() {
  const { settings, isLoading } = useReminderSettings();

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="px-5 pb-12 pt-4">
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <NotificationsForm key={settings ? 'loaded' : 'none'} settings={settings} />
      )}
    </ScrollView>
  );
}
