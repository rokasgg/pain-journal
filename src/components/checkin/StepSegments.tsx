import { View } from 'react-native';

export interface StepSegmentsProps {
  // 1-based current step; 0 = none filled (pre-steps).
  step: number;
  totalSteps: number;
}

// Segmented progress under the header (design: three bars, filled up to the
// current step). The fill is an always-rendered layer shown via opacity.
export function StepSegments({ step, totalSteps }: StepSegmentsProps) {
  return (
    <View className="flex-row gap-3 px-5 pt-1">
      {Array.from({ length: totalSteps }, (_, index) => (
        <View key={index} className="h-1 flex-1 overflow-hidden rounded-full bg-segmentTrack dark:bg-segmentTrackDark">
          <View
            className="absolute inset-0 rounded-full bg-accent dark:bg-primaryDark"
            style={{ opacity: index < step ? 1 : 0 }}
          />
        </View>
      ))}
    </View>
  );
}
