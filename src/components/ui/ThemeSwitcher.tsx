import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useThemeStore, type ThemeMode } from '@/store/useThemeStore';
import { haptics } from '@/utils/haptics';

const OPTIONS: { labelKey: string; value: ThemeMode }[] = [
  { labelKey: 'settings.themeSystem', value: 'system' },
  { labelKey: 'settings.themeLight', value: 'light' },
  { labelKey: 'settings.themeDark', value: 'dark' },
];

// Shadow via style (not `shadow-sm`): see the class-stability note below.
const PILL_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
} as const;

export interface ThemeSwitcherProps {
  className?: string;
}

// Segmented System / Light / Dark control — grey track with a raised white
// "pill" for the selected option (design from assets/possible-app-design/settings).
//
// Class stability matters here: NativeWind "upgrades" (remounts) an element
// when it starts using CSS-variable styles after its first render — e.g. an
// option gaining `bg-white`/`shadow-sm` when the persisted theme rehydrates
// and the selection moves. In dev that upgrade's warning stringifies props
// and hit React Navigation's throwing default context ("Couldn't find a
// navigation context"), crashing Settings. So every option renders the same
// classes, and the white pill is an always-present layer whose visibility
// (and shadow) is toggled through `style` only.
export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <View className={`flex-row rounded-xl bg-borderLight p-1 dark:bg-borderDark ${className ?? ''}`}>
      {OPTIONS.map((option) => {
        const isActive = option.value === mode;

        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (option.value !== mode) haptics.tick();
              setMode(option.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center rounded-lg py-2"
          >
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-lg bg-white dark:bg-surfaceDark"
              style={isActive ? PILL_SHADOW : { opacity: 0 }}
            />
            <Text className="text-sm font-semibold text-black dark:text-white" style={{ opacity: isActive ? 1 : 0.6 }}>
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
