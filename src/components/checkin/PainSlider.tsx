import { Pressable, Text, View } from 'react-native';

export interface PainSliderProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  className?: string;
}

const LEVELS = Array.from({ length: 11 }, (_, i) => i);

export function PainSlider({ label, value, onChange, className }: PainSliderProps) {
  return (
    <View className={`gap-2 ${className ?? ''}`}>
      <Text className="text-sm font-medium text-black dark:text-white">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {LEVELS.map((level) => {
          const isActive = value === level;
          return (
            <Pressable
              key={level}
              onPress={() => onChange(level)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${level}`}
              className={`h-9 w-9 items-center justify-center rounded-full ${
                isActive ? 'bg-black dark:bg-white' : 'border border-gray-300 dark:border-gray-700'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? 'text-white dark:text-black' : 'text-black dark:text-white'
                }`}
              >
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
