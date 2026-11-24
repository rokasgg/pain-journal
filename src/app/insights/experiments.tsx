import { ScrollView } from 'react-native';

import { ExperimentsOverview } from '@/components/insights/ExperimentCard';

// Experiments hub, opened from the Insights tile: the running experiment, all
// ideas to try, and past results.
export default function ExperimentsScreen() {
  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
      <ExperimentsOverview />
    </ScrollView>
  );
}
