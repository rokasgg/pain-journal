import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useState } from 'react';

import { Input } from '@/components/ui/Input';
import { useReminderSettings, useUpdateReminderSettings } from '@/hooks/useReminderSettings';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { ReminderSettings } from '@/types/database.types';
import { requestNotificationPermission } from '@/utils/notifications';
import { toast } from '@/utils/toast';

interface NotificationsFormProps {
  settings: ReminderSettings | null;
}

function NotificationsForm({ settings }: NotificationsFormProps) {
  const { t } = useTranslation();
  const updateReminderSettingsMutation = useUpdateReminderSettings();
  const [morningTime, setMorningTime] = useState(settings?.morning_time ?? '08:00');
  const [eveningTime, setEveningTime] = useState(settings?.evening_time ?? '21:00');
  const [pushEnabled, setPushEnabled] = useState(settings?.push_enabled ?? true);

  const handleSave = async () => {
    let nextPushEnabled = pushEnabled;

    if (pushEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error(t('settings.notificationPermissionDenied'));
        nextPushEnabled = false;
        setPushEnabled(false);
      }
    }

    const { error } = await updateReminderSettingsMutation.mutateAsync({
      morning_time: morningTime,
      evening_time: eveningTime,
      push_enabled: nextPushEnabled,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('settings.remindersUpdated'));
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between rounded-2xl bg-primaryMuted px-4 py-3 dark:bg-primaryMutedDark">
        <Text className="text-base text-black dark:text-white">{t('settings.pushNotifications')}</Text>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Input label={t('settings.morningReminder')} placeholder="08:00" value={morningTime} onChangeText={setMorningTime} />
      <Input label={t('settings.eveningReminder')} placeholder="21:00" value={eveningTime} onChangeText={setEveningTime} />

      <Pressable
        onPress={handleSave}
        disabled={updateReminderSettingsMutation.isPending}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {updateReminderSettingsMutation.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">{t('settings.saveReminders')}</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function NotificationsScreen() {
  const { settings, isLoading } = useReminderSettings();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <NotificationsForm key={settings ? 'loaded' : 'none'} settings={settings} />
      )}
    </ScrollView>
  );
}
