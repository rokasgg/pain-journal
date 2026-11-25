import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CheckinDetailView } from '@/components/history/CheckinDetailView';
import { FlareUpDetailView } from '@/components/history/FlareUpDetailView';
import { FlareLeadUpCard } from '@/components/insights/FlareLeadUpCard';
import { LockedCard } from '@/components/premium/LockedCard';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { usePremium } from '@/hooks/usePremium';
import { toLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { isHistoryDateLocked } from '@/lib/premium';
import { useToday } from '@/store/useTodayStore';

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

export default function HistoryEntryDetailModal() {
  const { kind, id } = useLocalSearchParams<{ kind: 'checkin' | 'flareUp'; id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { checkins } = useCheckinHistory(365);
  const { flareUps } = useFlareUps(365);
  const { isPremium } = usePremium();
  const today = useToday();

  if (kind === 'flareUp') {
    const flareUp = flareUps.find((f) => f.id === id);

    if (!flareUp) {
      return (
        <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
          <Text className="text-gray-500 dark:text-gray">{t('common.entryNotFound')}</Text>
        </View>
      );
    }

    if (isHistoryDateLocked(toLocalDate(flareUp.occurred_at), today, isPremium)) {
      return (
        <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="px-6 py-6">
          <LockedCard feature="history" />
        </ScrollView>
      );
    }

    return (
      <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
        <EditLink href={{ pathname: '/flare-up/edit/[id]', params: { id: flareUp.id } }} />
        <FlareUpDetailView flareUp={flareUp} />
        {/* The flare-up detective is Premium; free users just don't see the card. */}
        <PremiumGate feature="findings" fallback={null}>
          <FlareLeadUpCard flareUp={flareUp} />
        </PremiumGate>
      </ScrollView>
    );
  }

  const checkin = checkins.find((c) => c.id === id);

  if (!checkin) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-backgroundDark">
        <Text className="text-gray-500 dark:text-gray">{t('common.entryNotFound')}</Text>
      </View>
    );
  }

  if (isHistoryDateLocked(checkin.checkin_date, today, isPremium)) {
    return (
      <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="px-6 py-6">
        <LockedCard feature="history" />
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
      <CheckinDetailView checkin={checkin} onDeleted={() => router.back()} />
    </ScrollView>
  );
}
