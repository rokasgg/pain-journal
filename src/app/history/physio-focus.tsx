import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { PhysioSummaryCard } from '@/components/insights/PhysioSummaryCard';
import { MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';
import { daysSince, formatCheckinDate, formatMonthDay } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-[76px] basis-[48%] grow justify-between rounded-xl bg-surface p-3 dark:bg-surfaceDark">
      <Text
        numberOfLines={2}
        className="text-xs font-medium uppercase text-gray-500 dark:text-gray"
      >
        {label}
      </Text>
      <Text className="text-lg font-bold text-black dark:text-white">{value}</Text>
    </View>
  );
}

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

  const metrics: { key: string; label: string; value: string }[] = latest
    ? [
        { key: 'visits', label: t('insights.metricVisits'), value: String(assessments.length) },
        { key: 'lastVisit', label: t('insights.metricLastVisit'), value: formatMonthDay(latest.visit_date) },
      ]
    : [];

  const daysUntilNextVisit = latest?.next_visit_date ? -daysSince(latest.next_visit_date) : null;

  return (
    <ScrollView className="flex-1 bg-background dark:bg-backgroundDark" contentContainerClassName="gap-6 px-6 py-6">
      {!latest ? (
        <Text className="text-gray-500 dark:text-gray">{t('home.physioFocusEmpty')}</Text>
      ) : (
        <>
          <View className="min-h-[64px] flex-row items-center gap-2 rounded-xl bg-surface p-3 dark:bg-surfaceDark">
            <Ionicons name="calendar-outline" size={18} color={colors.gray} />
            <View className="flex-1 justify-center">
              <Text className="text-xs text-gray-500 dark:text-gray">
                {t('insights.nextVisitShortLabel')}
              </Text>
              <Text className="text-base font-semibold text-black dark:text-white">
                {latest.next_visit_date ? formatCheckinDate(latest.next_visit_date) : t('insights.nextVisitNotSet')}
              </Text>
            </View>
            {daysUntilNextVisit !== null && daysUntilNextVisit >= 0 && (
              <View className="rounded-full bg-primaryMuted px-2.5 py-1 dark:bg-primaryMutedDark">
                <Text className="text-xs font-semibold text-primary dark:text-primaryDark">
                  {daysUntilNextVisit === 0
                    ? t('insights.daysUntilNextVisitToday')
                    : t('insights.daysUntilNextVisit', { days: daysUntilNextVisit })}
                </Text>
              </View>
            )}
          </View>

          {profile?.last_physio_focus_summary && (
            <View className="gap-1.5 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
              <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">
                {t('insights.physioFocusSectionTitle')}
              </Text>
              <Text className="text-base text-black dark:text-white">{profile.last_physio_focus_summary}</Text>
            </View>
          )}

          <View className="flex-row flex-wrap gap-3">
            {metrics.map((metric) => (
              <MetricCard key={metric.key} label={metric.label} value={metric.value} />
            ))}
          </View>

          <PhysioSummaryCard />
        </>
      )}

      <View className="h-px bg-gray-200 dark:bg-gray-800" />

      <View className="flex-row items-center justify-between">
        <Text className="ml-4 text-sm font-semibold uppercase text-gray-500 dark:text-gray">
          {t('physioVisits.title')}
        </Text>
        <Link href={'/physio-visit/new' as Href} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('physioVisits.logAVisit')}
            className="mr-3 h-8 w-8 items-center justify-center rounded-full dark:bg-primaryDark active:bg-primary/20"
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
