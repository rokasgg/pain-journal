// v1 (mechanical): groups only the LATEST visit's findings by status.
// v2 (future, NOT this pass): replace with an AI-synthesized summary across the
// full visit history, via a new edge function cached on profiles (e.g.
// last_muscle_focus_summary / last_muscle_focus_summary_at), auto-refreshed on
// visit save — same pattern as refreshPhysioFocus() in usePhysioAssessments.ts.
import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MUSCLE_STATUS_OPTIONS } from '@/constants/physio';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { MuscleFinding } from '@/types/database.types';

function ChipGroup({ label, findings }: { label: string; findings: MuscleFinding[] }) {
  if (findings.length === 0) return null;

  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase text-gray-500 dark:text-gray">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {findings.map((finding) => {
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
    </View>
  );
}

export function MuscleFocusCard() {
  const { t } = useTranslation();
  const { assessments } = usePhysioAssessments();
  const latest = assessments[0] ?? null;

  const { strengthen, stretch } = useMemo(() => {
    const findings = latest?.muscle_findings ?? [];
    return {
      strengthen: findings.filter((f) => f.status === 'weak'),
      stretch: findings.filter((f) => f.status === 'tight'),
    };
  }, [latest]);

  return (
    <Link href={'/history/physio-visits' as Href} asChild>
      <Pressable className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark border-primary dark:border-primaryDark border">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold text-black dark:text-white">
            {t('insights.muscleFocusTitle')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.gray} />
        </View>

        {!latest ? (
          <Text className="text-sm text-gray-500 dark:text-gray">{t('home.physioFocusEmpty')}</Text>
        ) : strengthen.length === 0 && stretch.length === 0 ? (
          <Text className="text-sm text-gray-500 dark:text-gray">{t('insights.muscleFocusNone')}</Text>
        ) : (
          <>
            <ChipGroup label={t('insights.muscleFocusStrengthen')} findings={strengthen} />
            <ChipGroup label={t('insights.muscleFocusStretch')} findings={stretch} />
          </>
        )}
      </Pressable>
    </Link>
  );
}
