import { startOfWeek } from 'date-fns';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface TriggerCount {
  label: string;
  count: number;
}

export function TopTriggers() {
  const { t } = useTranslation();
  const { checkins } = useCheckinHistory(7);
  const { flareUps } = useFlareUps(7);

  const topTriggers: TriggerCount[] = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const weekStartDate = weekStart.slice(0, 10);

    const tally = new Map<string, number>();

    for (const checkin of checkins) {
      if (checkin.checkin_date < weekStartDate) continue;
      for (const trigger of checkin.triggers) {
        tally.set(trigger, (tally.get(trigger) ?? 0) + 1);
      }
    }

    for (const flareUp of flareUps) {
      if (flareUp.occurred_at < weekStart) continue;
      if (flareUp.likely_cause) {
        tally.set(flareUp.likely_cause, (tally.get(flareUp.likely_cause) ?? 0) + 1);
      }
    }

    return [...tally.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [checkins, flareUps]);

  const maxCount = topTriggers[0]?.count ?? 1;

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-base font-semibold text-black dark:text-white">{t('home.topTriggersTitle')}</Text>

      {topTriggers.length === 0 ? (
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t('home.noTriggersThisWeek')}
        </Text>
      ) : (
        <View className="gap-2">
          {topTriggers.map((trigger) => (
            <View key={trigger.label} className="gap-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-black dark:text-white">{trigger.label}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">{trigger.count}</Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-primaryMuted dark:bg-primaryMutedDark">
                <View
                  className="h-full rounded-full bg-primary dark:bg-primaryDark"
                  style={{ width: `${(trigger.count / maxCount) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
