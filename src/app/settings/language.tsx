import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SettingsSection } from '@/components/settings/SettingsSection';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useLocaleStore, type Locale } from '@/store/useLocaleStore';
import { haptics } from '@/utils/haptics';

// Each language's own name (always shown as-is) + its name in the current
// UI language as the subtitle — so it's recognisable whichever is active.
const LANGUAGES: { locale: Locale; nativeName: string; localizedNameKey: string }[] = [
  { locale: 'en', nativeName: 'English', localizedNameKey: 'settings.languageNameEn' },
  { locale: 'lt', nativeName: 'Lietuvių', localizedNameKey: 'settings.languageNameLt' },
];

interface LanguageRowProps {
  nativeName: string;
  localizedName: string;
  selected: boolean;
  onPress: () => void;
  isLast?: boolean;
}

function LanguageRow({ nativeName, localizedName, selected, onPress, isLast }: LanguageRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="flex-row pl-4 active:opacity-60"
    >
      <View
        className={`flex-1 flex-row items-center gap-3 py-3.5 pr-4 ${
          isLast ? '' : 'border-b border-borderLight dark:border-borderDark'
        }`}
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-lg font-semibold text-black dark:text-white">{nativeName}</Text>
          <Text className="text-sm text-gray">{localizedName}</Text>
        </View>
        {/* Always rendered, toggled by opacity via style — keeps classes stable
            (NativeWind upgrade gotcha, CLAUDE.md). */}
        <View style={{ opacity: selected ? 1 : 0 }}>
          <Ionicons name="checkmark" size={24} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}

// Settings → Language (design from assets/possible-app-design/setting).
// Pushed page; picking a language applies it immediately — no Save.
export default function LanguageScreen() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="px-5 pb-12 pt-4">
      <SettingsSection footer={t('settings.languageFooter')}>
        {LANGUAGES.map((language) => (
          <LanguageRow
            key={language.locale}
            nativeName={language.nativeName}
            localizedName={t(language.localizedNameKey)}
            selected={language.locale === locale}
            onPress={() => {
              if (language.locale === locale) return;
              haptics.tick();
              setLocale(language.locale);
            }}
          />
        ))}
      </SettingsSection>
    </ScrollView>
  );
}
