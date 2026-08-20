import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useLocaleStore, type Locale } from '@/store/useLocaleStore';

export function LanguageSwitcher() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const { t } = useTranslation();

  const options: { label: string; value: Locale }[] = [
    { label: t('languageSwitcher.english'), value: 'en' },
    { label: t('languageSwitcher.lithuanian'), value: 'lt' },
  ];

  return (
    <View className="flex-row rounded-lg bg-gray-100 p-1 dark:bg-surfaceDark bg-surface border-gray dark:border-primaryDark border">
      {options.map((option) => {
        const isActive = option.value === locale;

        return (
          <Pressable
            key={option.value}
            onPress={() => setLocale(option.value)}
            className={`flex-1 items-center rounded-md py-2 ${isActive ? 'bg-primary dark:bg-black' : ''
              }`}
          >
            <Text
              className={`text-sm font-medium ${isActive
                ? 'text-white dark:text-white '
                : 'text-strongGray dark:text-gray'
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
