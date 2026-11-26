import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PainSlider } from '@/components/checkin/PainSlider';
import { Input } from '@/components/ui/Input';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { setDetail, toggleTicked, type TrainingDraft } from '@/lib/trainingLog';
import type { Exercise } from '@/types/database.types';
import { haptics } from '@/utils/haptics';

export interface TrainingChecklistProps {
  exercises: Exercise[];
  draft: TrainingDraft;
  onChange: (draft: TrainingDraft) => void;
}

// The library as one tick list. Tapping a row ticks it; a ticked row gets a
// chevron that expands the optional discomfort slider + note in place (the
// chevron turns green once a value is set, so it's visible collapsed).
export function TrainingChecklist({ exercises, draft, onChange }: TrainingChecklistProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View className="overflow-hidden rounded-2xl bg-surface dark:bg-surfaceDark">
      {exercises.map((exercise, index) => {
        const ticked = draft.ticked.includes(exercise.id);
        const detail = draft.details[exercise.id];
        const hasDetail = !!detail && (detail.painDiscomfortLevel > 0 || detail.note.trim().length > 0);
        const isExpanded = ticked && expandedIds.has(exercise.id);
        const subtitle = [exercise.target_sets_reps, exercise.muscle_group].filter(Boolean).join(' · ');

        return (
          <View key={exercise.id}>
            {index > 0 && <View className="ml-14 h-px bg-borderLight dark:bg-borderDark" />}
            <View className="flex-row items-center gap-2 px-4 py-3">
              <Pressable
                onPress={() => {
                  haptics.tick();
                  onChange(toggleTicked(draft, exercise.id));
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: ticked }}
                accessibilityLabel={exercise.name}
                className="flex-1 flex-row items-center gap-3"
              >
                <Ionicons
                  name={ticked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={ticked ? colors.accent : colors.gray}
                />
                <View className="flex-1">
                  <Text className="text-body text-black dark:text-white">{exercise.name}</Text>
                  {subtitle.length > 0 && <Text className="text-caption text-gray">{subtitle}</Text>}
                </View>
              </Pressable>

              {ticked && (
                <Pressable
                  onPress={() => toggleExpanded(exercise.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  accessibilityLabel={t('routine.exerciseDetailButton', { name: exercise.name })}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={hasDetail ? colors.accent : colors.gray}
                  />
                </Pressable>
              )}
            </View>

            {isExpanded && (
              <View className="gap-3 px-4 pb-4">
                <PainSlider
                  label={t('routine.discomfortDuringExercise')}
                  value={detail?.painDiscomfortLevel ?? 0}
                  onChange={(value) => onChange(setDetail(draft, exercise.id, { painDiscomfortLevel: value }))}
                />
                <Input
                  placeholder={t('routine.exerciseNotePlaceholder')}
                  value={detail?.note ?? ''}
                  onChangeText={(text) => onChange(setDetail(draft, exercise.id, { note: text }))}
                />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
