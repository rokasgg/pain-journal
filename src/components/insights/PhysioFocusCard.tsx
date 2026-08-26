import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export function PhysioFocusCard() {
  const { t } = useTranslation();
  const { assessments } = usePhysioAssessments();
  const { profile } = useProfile();

  const latest = assessments[0] ?? null;

  return (
    <Link href={'/history/physio-focus' as Href} asChild>
      <Pressable className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark border-primary dark:border-primaryDark">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-black dark:text-white">
            {t('insights.physioFocusCardTitle')}
          </Text>
          {!latest ? (
            <Text className="text-sm text-gray-500 dark:text-gray">{t('home.physioFocusEmpty')}</Text>
          ) : (
            <>
              <Text className="text-sm text-gray-500 dark:text-gray">
                {t('insights.lastVisitLabel', { date: formatCheckinDate(latest.visit_date) })}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray">
                {t('insights.nextVisitLabel', {
                  date: latest.next_visit_date
                    ? formatCheckinDate(latest.next_visit_date)
                    : t('insights.nextVisitNotSet'),
                })}
              </Text>
              {/* {profile?.last_physio_focus_summary && (
                <Text className="text-sm text-black dark:text-white">{profile.last_physio_focus_summary}</Text>
              )} */}
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </Pressable>
    </Link>
  );
}
