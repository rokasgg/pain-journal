import { View } from 'react-native';

export interface StepDotsProps {
  step: number;
  totalSteps: number;
}

export function StepDots({ step, totalSteps }: StepDotsProps) {
  return (
    <View className="mr-4 flex-row items-center gap-2">
      {Array.from({ length: totalSteps }, (_, index) => {
        const isCurrent = index === step - 1;
        const isDone = index < step - 1;
        return (
          <View
            key={index}
            className={`rounded-full ${isCurrent
              ? 'h-2.5 w-2.5 bg-primary dark:bg-primaryDark'
              : isDone
                ? 'h-2 w-2 bg-primary/50 dark:bg-primaryDark/50'
                : 'h-2 w-2 bg-gray dark:bg-gray-600'
              }`}
          />
        );
      })}
    </View>
  );
}
