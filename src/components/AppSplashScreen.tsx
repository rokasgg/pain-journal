import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { OakTree } from '@/components/OakTree';

const OAK_SIZE = 200;

// Full-grown oak (stage 5) as the brand mark — the user's own stage isn't
// known yet while the splash is up.
export function AppSplashScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
      <Animated.View entering={FadeIn.duration(250)}>
        <OakTree stage={5} size={OAK_SIZE} />
      </Animated.View>
      <Text className="text-4xl font-bold text-black dark:text-white">Pain Journal</Text>
    </View>
  );
}
