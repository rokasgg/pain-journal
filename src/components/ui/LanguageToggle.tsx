import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLocaleStore, type Locale } from '@/store/useLocaleStore';
import { haptics } from '@/utils/haptics';

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'EN' },
  { locale: 'lt', label: 'LT' },
];

// Compact EN | LT switch for the screens before login (login, register),
// pinned top-right inside the safe area. Picking one counts as an explicit
// choice (useLocaleStore.chosen), so it stays after signing in. The selected
// pill is always rendered and shown via opacity, never a class swap
// (NativeWind remount gotcha, CLAUDE.md).
export function LanguageToggle() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.language')}
      className="absolute right-5 flex-row rounded-full bg-segmentTrack p-1 dark:bg-segmentTrackDark"
      style={{ top: insets.top + 8 }}
    >
      {OPTIONS.map((option) => {
        const selected = option.locale === locale;
        return (
          <Pressable
            key={option.locale}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.tick();
              setLocale(option.locale);
            }}
            hitSlop={6}
            className="items-center justify-center px-3 py-1.5"
          >
            <View
              className="absolute inset-0 rounded-full bg-surface dark:bg-surfaceDark"
              style={{ opacity: selected ? 1 : 0 }}
            />
            <Text
              className="text-[13px] font-semibold text-ink dark:text-white"
              style={{ opacity: selected ? 1 : 0.55 }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
