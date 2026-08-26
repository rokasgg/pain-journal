// v1 (mechanical): groups only the LATEST visit's findings by status.
// v2 (future, NOT this pass): replace with an AI-synthesized summary across the
// full visit history, via a new edge function cached on profiles (e.g.
// last_muscle_focus_summary / last_muscle_focus_summary_at), auto-refreshed on
// visit save — same pattern as refreshPhysioFocus() in usePhysioAssessments.ts.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useDailyChecklistStore } from '@/store/useDailyChecklistStore';
import type { MuscleFinding } from '@/types/database.types';

interface ChecklistSectionProps {
  title: string;
  findings: MuscleFinding[];
  emptyText: string;
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
}

function ChecklistSection({ title, findings, emptyText, isChecked, onToggle }: ChecklistSectionProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold uppercase text-primary dark:text-gray">{title}</Text>
      {findings.length === 0 ? (
        <Text className="text-sm text-gray-500 dark:text-gray">{emptyText}</Text>
      ) : (
        <View className="gap-1">
          {findings.map((finding) => {
            const checked = isChecked(finding.id);
            return (
              <Pressable
                key={finding.id}
                onPress={() => onToggle(finding.id)}
                className="flex-row items-center gap-2 py-1.5"
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={checked ? colors.primary : colors.gray}
                />
                <Text
                  className={`text-base ${checked ? 'text-gray-500 line-through dark:text-gray' : 'text-black dark:text-white'
                    }`}
                >
                  {finding.muscle_name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function TodaysFocusCard() {
  const { t } = useTranslation();
  const { assessments } = usePhysioAssessments();
  const { date, checked, toggle } = useDailyChecklistStore();

  const latest = assessments[0] ?? null;
  const findings = latest?.muscle_findings ?? [];
  const stretch = findings.filter((f) => f.status === 'tight');
  const strengthen = findings.filter((f) => f.status === 'weak');

  const isToday = date === todayLocalDate();
  const isChecked = (id: string) => isToday && !!checked[id];

  return (
    <View className="gap-4 rounded-2xl bg-surface p-4 dark:bg-surfaceDark border-primary dark:border-primaryDark">
      <Text className="text-base font-semibold text-black dark:text-white">{t('insights.todaysFocusTitle')}</Text>

      <ChecklistSection
        title={t('insights.stretchSectionTitle')}
        findings={stretch}
        emptyText={t('insights.noStretchItems')}
        isChecked={isChecked}
        onToggle={toggle}
      />
      <ChecklistSection
        title={t('insights.strengthenSectionTitle')}
        findings={strengthen}
        emptyText={t('insights.noStrengthenItems')}
        isChecked={isChecked}
        onToggle={toggle}
      />
    </View>
  );
}
