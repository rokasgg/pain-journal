import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

export interface StoryProgressProps {
  count: number;
  index: number;
  // 0→1 fill of the active segment, driven by the story screen's timer.
  progress: SharedValue<number>;
  className?: string;
}

function ActiveFill({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return <Animated.View style={style} className="h-full rounded-full bg-black dark:bg-white" />;
}

export function StoryProgress({ count, index, progress, className }: StoryProgressProps) {
  return (
    <View className={`flex-row gap-1 ${className ?? ''}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-black/15 dark:bg-white/20">
          {i < index && <View className="h-full w-full rounded-full bg-black dark:bg-white" />}
          {i === index && <ActiveFill progress={progress} />}
        </View>
      ))}
    </View>
  );
}
