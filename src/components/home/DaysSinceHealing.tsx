import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useProfile } from '@/hooks/useProfile';
import { daysSince } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

// Home header pill (design from assets/possible-app-design/home):
// "🌱 Day 63 of healing" — the same 1-based count as the Injury info page —
// or a "Set healing date" prompt linking there. Tappable either way.
export function DaysSinceHealing() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const healingStartedOn = profile?.healing_started_on;

  return (
    <Link href={'/settings/injury-info' as Href} asChild>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2.5 active:opacity-70"
      >
        <Ionicons name="leaf-outline" size={16} color={colors.primary} />
        <Text className="text-base font-semibold text-primary dark:text-primaryDark">
          {healingStartedOn
            ? t('injuryInfo.dayOfHealing', { day: daysSince(healingStartedOn) + 1 })
            : t('home.setHealingDate')}
        </Text>
      </Pressable>
    </Link>
  );
}
