import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { useMemo } from 'react';
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

  const stats = useMemo(() => {
    if (!latest) return null;

    const findings = latest.muscle_findings ?? [];
    const weakCount = findings.filter((f) => f.status === 'weak').length;
    const tightCount = findings.filter((f) => f.status === 'tight').length;

    return t('home.physioFocusStats', {
      count: assessments.length,
      date: formatCheckinDate(latest.visit_date),
      weak: weakCount,
      tight: tightCount,
    });
  }, [assessments.length, latest, t]);

  return (
    <Link href={'/history/physio-visits' as Href} asChild>
      <Pressable className="flex-row items-center gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
        <View className="flex-1 gap-2">
          <Text className="text-base font-semibold text-black dark:text-white">{t('home.physioFocusTitle')}</Text>

          {!latest ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400">{t('home.physioFocusEmpty')}</Text>
          ) : (
            <View className="gap-1">
              {profile?.last_physio_focus_summary && (
                <Text className="text-sm text-black dark:text-white">{profile.last_physio_focus_summary}</Text>
              )}
              {stats && <Text className="text-xs text-gray-500 dark:text-gray-400">{stats}</Text>}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </Pressable>
    </Link>
  );
}
