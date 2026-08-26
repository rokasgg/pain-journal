import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { CheckinDetailView } from '@/components/history/CheckinDetailView';
import { FlareUpDetailView } from '@/components/history/FlareUpDetailView';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Checkin, FlareUp } from '@/types/database.types';

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

export interface DayEntriesProps {
  checkins: Checkin[];
  flareUps: FlareUp[];
}

export function DayEntries({ checkins, flareUps }: DayEntriesProps) {
  const { t } = useTranslation();

  const morningCheckin = checkins.find((c) => c.type === 'morning');
  const eveningCheckin = checkins.find((c) => c.type === 'evening');
  const hasAnyEntry = morningCheckin || eveningCheckin || flareUps.length > 0;

  return (
    <View className="gap-6">
      {!hasAnyEntry && (
        <Text className="text-sm text-gray-500 dark:text-gray">{t('history.dayNoEntries')}</Text>
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

      {flareUps.length > 0 && (morningCheckin || eveningCheckin) && (
        <View className="h-px bg-gray-200 dark:bg-gray-800" />
      )}

      {flareUps.map((flareUp, index) => (
        <View key={flareUp.id} className="gap-4">
          {index > 0 && <View className="h-px bg-gray-200 dark:bg-gray-800" />}
          <EditLink href={{ pathname: '/flare-up/edit/[id]', params: { id: flareUp.id } }} />
          <FlareUpDetailView flareUp={flareUp} showDate={false} />
        </View>
      ))}
    </View>
  );
}
