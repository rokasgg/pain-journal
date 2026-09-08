import { View } from 'react-native';

export interface StepProgressBarProps {
  step: number;
  totalSteps: number;
}

// Thin horizontal progress bar — replaces StepCounter's "x/y" text for
// routine/review.tsx, where a step exists per exercise (easily 9+) and
// neither one-dot-per-step (StepDots) nor plain text read well at that
// count. Rendered as a full-width bar under the header, not squeezed into
// the header's headerRight slot.
export function StepProgressBar({ step, totalSteps }: StepProgressBarProps) {
  // Percentage width is inherently dynamic per render — NativeWind can't
  // express an arbitrary runtime value via className, so this is the
  // sanctioned style-prop exception (see CLAUDE.md's NativeWind Styles
  // section).
  const progress = Math.min(1, Math.max(0, step / totalSteps));

  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
      <View
        className="h-full rounded-full bg-primary dark:bg-primaryDark"
        style={{ width: `${progress * 100}%` }}
      />
    </View>
  );
}
