import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FALLBACK_OAK_STAGE } from '@/components/oak/oakConfig';
import { WateringCelebration } from '@/components/oak/WateringCelebration';
import { useTrainingCelebrationStore } from '@/store/useTrainingCelebrationStore';

// The watering moment after a logged workout, on the same oak as everywhere
// else (its stage comes from check-in days; watering never grows it). A
// plain in-tree overlay, never RN's <Modal>, for the same reason as
// WateringCelebrationHost: it goes up as training/log.tsx pops. Mounted once
// at root after the Stack, so it also covers the tab bar.
export function TrainingCelebrationHost() {
  const celebration = useTrainingCelebrationStore((state) => state.celebration);
  const hide = useTrainingCelebrationStore((state) => state.hide);
  const insets = useSafeAreaInsets();

  if (!celebration) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(250)}
      className="absolute inset-0 bg-background dark:bg-backgroundDark"
    >
      <View className="flex-1" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <WateringCelebration
          stage={celebration.stage ?? FALLBACK_OAK_STAGE}
          sessions={celebration.sessions}
          goal={celebration.goal}
          counted={celebration.counted}
          onDone={hide}
        />
      </View>
    </Animated.View>
  );
}
