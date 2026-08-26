import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { PhysioSummaryCard } from '@/components/insights/PhysioSummaryCard';
import { MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';
import { formatCheckinDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export default function PhysioFocusDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { assessments, isLoading } = usePhysioAssessments();
  const { profile } = useProfile();

  const latest = assessments[0] ?? null;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
        <ActivityIndicator />
      </View>
    );
  }

  const weakCount = latest ? (latest.muscle_findings ?? []).filter((f) => f.status === 'weak').length : 0;
  const tightCount = latest ? (latest.muscle_findings ?? []).filter((f) => f.status === 'tight').length : 0;
  const statsLine = latest
    ? t('home.physioFocusStats', {
      count: assessments.length,
      date: formatCheckinDate(latest.visit_date),
      weak: weakCount,
      tight: tightCount,
    })
    : null;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-4 px-6 py-6">
      {!latest ? (
        <Text className="text-gray-500 dark:text-gray">{t('home.physioFocusEmpty')}</Text>
      ) : (
        <>
          <Text className="text-sm text-gray-500 dark:text-gray">
            {t('insights.lastVisitLabel', { date: formatCheckinDate(latest.visit_date) })}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray">
            {t('insights.nextVisitLabel', {
              date: latest.next_visit_date ? formatCheckinDate(latest.next_visit_date) : t('insights.nextVisitNotSet'),
            })}
          </Text>

          {profile?.last_physio_focus_summary && (
            <Text className="text-base text-black dark:text-white">{profile.last_physio_focus_summary}</Text>
          )}

          {statsLine && <Text className="text-xs text-gray-500 dark:text-gray">{statsLine}</Text>}

          <View className="h-px bg-gray-200 dark:bg-gray-800" />

          <PhysioSummaryCard />
        </>
      )}

      <View className="h-px bg-gray-200 dark:bg-gray-800" />

      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray">
          {t('physioVisits.title')}
        </Text>
        <Link href={'/physio-visit/new' as Href} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('physioVisits.logAVisit')}
            className="h-8 w-8 items-center justify-center rounded-full dark:bg-primaryDark active:bg-primary/20"
          >
            <Ionicons name="add" size={20} color={colors.primary} />
          </Pressable>
        </Link>
      </View>

      {assessments.length === 0 ? (
        <Text className="text-base text-gray-500 dark:text-gray">{t('physioVisits.noVisitsYet')}</Text>
      ) : (
        <View className="gap-3">
          {assessments.map((assessment) => (
            <Pressable
              key={assessment.id}
              onPress={() => router.push(`/physio-visit/${assessment.id}` as Href)}
              className="gap-2 rounded-2xl bg-surface p-4 dark:bg-surfaceDark"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-black dark:text-white">
                  {formatCheckinDate(assessment.visit_date)}
                </Text>
                {assessment.physio_name && (
                  <Text className="text-sm text-gray-500 dark:text-gray">{assessment.physio_name}</Text>
                )}
              </View>

              <View className="flex-row flex-wrap gap-2">
                {(assessment.muscle_findings ?? []).map((finding) => {
                  const statusOption = MUSCLE_STATUS_OPTIONS.find((option) => option.value === finding.status);
                  return (
                    <View
                      key={finding.id}
                      className={`rounded-full px-3 py-1.5 ${statusOption?.activeClassName ?? 'bg-gray-500'}`}
                    >
                      <Text className={`text-sm font-medium ${statusOption?.activeTextClassName ?? 'text-white'}`}>
                        {finding.muscle_name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
