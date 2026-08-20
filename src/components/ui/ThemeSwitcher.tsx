import { Pressable, Text, View } from 'react-native';

import { useThemeStore, type ThemeMode } from '@/store/useThemeStore';

const OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function ThemeSwitcher() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <View className="flex-row rounded-lg bg-white p-1 dark:dark:bg-surfaceDark border-gray dark:border-primaryDark border">
      {OPTIONS.map((option) => {
        const isActive = option.value === mode;

        return (
          <Pressable
            key={option.value}
            onPress={() => setMode(option.value)}
            className={`flex-1 items-center rounded-md py-2 ${isActive ? 'bg-primary dark:bg-black' : ' bg-white dark:bg-surfaceDark'
              }`}
          >
            <Text
              className={`text-sm font-semibold ${isActive
                ? 'text-white dark:text-white'
                : 'text-black dark:text-gray'
                }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
