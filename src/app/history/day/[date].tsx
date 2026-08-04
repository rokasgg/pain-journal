import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CheckinDetailView } from '@/components/history/CheckinDetailView';
import { FlareUpDetailView } from '@/components/history/FlareUpDetailView';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';

function EditLink({ href }: { href: Href }) {
  const { t } = useTranslation();
  return (
    <Link href={href} asChild>
      <Pressable className="items-center self-end rounded-full bg-primary px-3 py-1.5 dark:bg-primaryDark">
        <Text className="text-sm font-semibold text-white">{t('common.edit')}</Text>
      </Pressable>
    </Link>
  );
}

export default function HistoryDayModal() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { t } = useTranslation();
  const { checkins } = useCheckinHistory(90);
  const { flareUps } = useFlareUps(90);

  const dayCheckins = checkins.filter((c) => c.checkin_date === date);
  const morningCheckin = dayCheckins.find((c) => c.type === 'morning');
  const eveningCheckin = dayCheckins.find((c) => c.type === 'evening');
  const dayFlareUps = flareUps.filter((f) => f.occurred_at.slice(0, 10) === date);

  const hasAnyEntry = morningCheckin || eveningCheckin || dayFlareUps.length > 0;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-6 px-6 py-6">
      <Text className="text-xl font-bold text-black dark:text-white">
        {date ? formatCheckinDate(date) : ''}
      </Text>

      {!hasAnyEntry && (
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {t('history.dayNoEntries')}
        </Text>
      )}

      {morningCheckin && (
        <View className="gap-4">
          <EditLink href={{ pathname: '/checkin/edit/[id]', params: { id: morningCheckin.id } }} />
          <CheckinDetailView checkin={morningCheckin} showDate={false} />
        </View>
      )}

      {morningCheckin && eveningCheckin && <View className="h-px bg-gray-200 dark:bg-gray-800" />}

      {eveningCheckin && (
        <View className="gap-4">
          <EditLink href={{ pathname: '/checkin/edit/[id]', params: { id: eveningCheckin.id } }} />
          <CheckinDetailView checkin={eveningCheckin} showDate={false} />
        </View>
      )}

      {dayFlareUps.length > 0 && (morningCheckin || eveningCheckin) && (
        <View className="h-px bg-gray-200 dark:bg-gray-800" />
      )}

      {dayFlareUps.map((flareUp, index) => (
        <View key={flareUp.id} className="gap-4">
          {index > 0 && <View className="h-px bg-gray-200 dark:bg-gray-800" />}
          <EditLink href={{ pathname: '/flare-up/edit/[id]', params: { id: flareUp.id } }} />
          <FlareUpDetailView flareUp={flareUp} showDate={false} />
        </View>
      ))}
    </ScrollView>
  );
}
