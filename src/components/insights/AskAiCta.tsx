import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export function AskAiCta() {
  const { t } = useTranslation();

  return (
    <Link href={'/insights/chat' as Href} asChild>
      <Pressable className="flex-row items-center justify-center gap-2 rounded-xl bg-primary h-14 dark:bg-primaryDark active:opacity-90">
        <Ionicons name="sparkles" size={18} color={colors.white} />
        <Text className="text-base font-semibold text-white">{t('insights.askAiCta')}</Text>
      </Pressable>
    </Link>
  );
}
