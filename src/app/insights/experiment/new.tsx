import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { SegmentedChoice } from '@/components/ui/SegmentedChoice';
import {
  CUSTOM_EXPERIMENT,
  DEFAULT_EXPERIMENT_LENGTH,
  EXPERIMENT_TEMPLATES,
  templateFor,
} from '@/constants/experiments';
import { useExperiments, useStartExperiment } from '@/hooks/useExperiments';
import { useKeepFocusedInputVisible } from '@/hooks/useKeepFocusedInputVisible';
import { experimentTitle } from '@/lib/experimentText';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

type LengthChoice = '7' | '14';

// Start an experiment: pick a template (or write your own), pick 1 or 2
// weeks, start. Opened from Insights → Experiments and from a flare-up
// pattern's "Test it with an experiment" (?template=…).
export default function NewExperimentScreen() {
  const keepFocusedVisible = useKeepFocusedInputVisible();
  const { template: initialTemplate } = useLocalSearchParams<{
    template?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { running } = useExperiments();
  const startExperiment = useStartExperiment();

  const [template, setTemplate] = useState<string>(
    initialTemplate === CUSTOM_EXPERIMENT || (initialTemplate && templateFor(initialTemplate))
      ? initialTemplate
      : EXPERIMENT_TEMPLATES[0].id,
  );
  const [customTitle, setCustomTitle] = useState('');
  const [length, setLength] = useState<LengthChoice>(String(DEFAULT_EXPERIMENT_LENGTH) as LengthChoice);

  const isCustom = template === CUSTOM_EXPERIMENT;
  const canStart = !isCustom || customTitle.trim().length > 0;
  const howTo = isCustom ? null : t(`experiments.templates.${template}.howTo`);

  const handleStart = async () => {
    if (!canStart || startExperiment.isPending) return;
    const result = await startExperiment.mutateAsync({
      template,
      custom_title: isCustom ? customTitle.trim() : null,
      length_days: Number(length),
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    haptics.success();
    router.back();
  };

  const options = [
    ...EXPERIMENT_TEMPLATES.map((tpl) => ({
      id: tpl.id,
      icon: tpl.icon,
      title: t(`experiments.templates.${tpl.id}.title`),
    })),
    {
      id: CUSTOM_EXPERIMENT,
      icon: 'create-outline' as const,
      title: t('experiments.custom'),
    },
  ];

  return (
    <ScrollView
      {...keepFocusedVisible}
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-6"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <View className="overflow-hidden rounded-[18px] bg-surface dark:bg-surfaceDark">
        {options.map((option, index) => {
          const selected = option.id === template;
          return (
            <View key={option.id}>
              {index > 0 && <View className="ml-12 h-px bg-borderLight dark:bg-borderDark" />}
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (!selected) haptics.tick();
                  setTemplate(option.id);
                }}
                className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-70"
              >
                <Ionicons name={option.icon} size={20} color={colors.accent} />
                <Text className="flex-1 text-[16px] text-ink dark:text-white">{option.title}</Text>
                <Ionicons name="checkmark" size={20} color={colors.accent} style={{ opacity: selected ? 1 : 0 }} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {isCustom ? (
        <Input
          label={t('experiments.customLabel')}
          placeholder={t('experiments.customPlaceholder')}
          value={customTitle}
          onChangeText={setCustomTitle}
          maxLength={80}
          returnKeyType="done"
        />
      ) : (
        howTo && <Text className="px-1 text-[15px] leading-5 text-inkSecondary dark:text-gray">{howTo}</Text>
      )}

      <View className="gap-3">
        <SectionTitle title={t('experiments.lengthTitle')} />
        <SegmentedChoice<LengthChoice>
          options={[
            { value: '7', label: t('experiments.oneWeek') },
            { value: '14', label: t('experiments.twoWeeks') },
          ]}
          value={length}
          onChange={setLength}
          accessibilityLabel={t('experiments.lengthTitle')}
        />
      </View>

      <View className="gap-1 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
        <Text className="text-[15px] font-semibold text-ink dark:text-white">{t('experiments.howItWorksTitle')}</Text>
        <Text className="text-[15px] leading-5 text-inkSecondary dark:text-gray">{t('experiments.howItWorks')}</Text>
      </View>

      {running && (
        <Text className="px-1 text-[14px] text-inkSecondary dark:text-gray">
          {t('experiments.replaceWarning', {
            title: experimentTitle(running, t),
          })}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canStart }}
        disabled={!canStart || startExperiment.isPending}
        onPress={handleStart}
        className="items-center rounded-xl bg-primary py-3.5 active:opacity-90 dark:bg-primaryDark"
        style={{ opacity: canStart ? 1 : 0.5 }}
      >
        {startExperiment.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-[17px] font-semibold text-white">{t('experiments.start')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
