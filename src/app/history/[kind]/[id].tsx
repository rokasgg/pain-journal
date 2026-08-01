import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CheckinDetailView } from '@/components/history/CheckinDetailView';
import { FlareUpDetailView } from '@/components/history/FlareUpDetailView';
import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';

function EditLink({ href }: { href: Href }) {
  return (
    <Link href={href} asChild>
      <Pressable className="items-center self-end rounded-full bg-black px-3 py-1.5 dark:bg-white">
        <Text className="text-sm font-semibold text-white dark:text-black">Edit</Text>
      </Pressable>
    </Link>
  );
}

export default function HistoryEntryDetailModal() {
  const { kind, id } = useLocalSearchParams<{ kind: 'checkin' | 'flareUp'; id: string }>();
  const { checkins } = useCheckinHistory(90);
  const { flareUps } = useFlareUps(90);

  if (kind === 'flareUp') {
    const flareUp = flareUps.find((f) => f.id === id);

    if (!flareUp) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
          <Text className="text-gray-500 dark:text-gray-400">Entry not found.</Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="gap-4 px-6 py-6">
        <EditLink href={{ pathname: '/flare-up/edit/[id]', params: { id: flareUp.id } }} />
        <FlareUpDetailView flareUp={flareUp} />
      </ScrollView>
    );
  }

  const checkin = checkins.find((c) => c.id === id);

  if (!checkin) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-gray-500 dark:text-gray-400">Entry not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" contentContainerClassName="gap-4 px-6 py-6">
      <EditLink href={{ pathname: '/checkin/edit/[id]', params: { id: checkin.id } }} />
      <CheckinDetailView checkin={checkin} />
    </ScrollView>
  );
}
