import { ScrollView } from 'react-native';

import { FlarePatternsCard } from '@/components/insights/FlarePatternsCard';

// Opened from a flare-up finding on Insights: every pattern the flare-up
// detective found, the tagged triggers, time of day, duration, and a matching
// experiment to try.
export default function FlareUpsInsightScreen() {
  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
      <FlarePatternsCard />
    </ScrollView>
  );
}
