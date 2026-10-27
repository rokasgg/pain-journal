import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, isToday, isYesterday, parseISO, subHours } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScaleSliderCard } from '@/components/checkin/ScaleSliderCard';
import { ChoiceChips, PillChip } from '@/components/flareup/ChoiceChips';
import { SettingsTextArea } from '@/components/settings/SettingsTextArea';
import {
  FLARE_AREA_LABEL_KEYS,
  FLARE_AREA_OPTIONS,
  FLARE_SYMPTOM_LABEL_KEYS,
  FLARE_SYMPTOM_OPTIONS,
  FLARE_TIME_PRESETS,
  FLARE_TRIGGER_ORDER,
  FLARE_UP_STATUS_OPTIONS,
  FLARE_URGENT_SYMPTOMS,
} from '@/constants/flareUp';
import { TRIGGER_LABEL_KEYS } from '@/constants/symptoms';
import { formatShortDayLabel } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { flareUpSchema, type FlareUpFormData } from '@/lib/validations/flareUp';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

export interface FlareUpFormProps {
  defaultValues?: FlareUpFormData;
  submitLabel: string;
  // Performs the actual save and reports the outcome instead of navigating
  // itself: `{ error }` on success or failure, or `undefined` when the save
  // was intentionally short-circuited — same contract as CheckinForm.
  onSubmit: (data: FlareUpFormData) => Promise<{ error: string | null } | undefined>;
  // Called right after a successful save — do the toast + navigation here,
  // not in onSubmit, so a short-circuited/failed save never navigates. The
  // success toast itself (toast.success, via ToastModalHost) is what plays
  // the checkmark animation now, not this form's submit button.
  onSaved?: () => void;
}

const PICKER_LOCALES = { en: 'en-GB', lt: 'lt-LT' } as const;

// A new flare-up opens on "now", and — per the design — "still going on".
function emptyDefaults(): FlareUpFormData {
  return {
    occurred_at: new Date().toISOString(),
    pain_level: 5,
    likely_cause: null,
    description: null,
    pain_areas: [],
    symptoms: [],
    triggers: [],
    status: 'ongoing',
  };
}

type TimeChoice = (typeof FLARE_TIME_PRESETS)[number]['id'] | 'custom';

function SectionTitle({ title, optional, right }: { title: string; optional?: boolean; right?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-baseline justify-between">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-heading text-ink dark:text-white">{title}</Text>
        {optional && <Text className="text-caption text-inkSecondary dark:text-gray">{t('flareUp.optional')}</Text>}
      </View>
      {right}
    </View>
  );
}

// Paūmėjimas (design: assets/possible-app-design/flareups). Top to bottom:
// when it started (quick chips), how strong, still going on, where it hurts,
// other symptoms (+ a warning for hand numbness/weakness), possible triggers,
// notes, and a pinned save button.
export function FlareUpForm({ defaultValues, submitLabel, onSubmit, onSaved }: FlareUpFormProps) {
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Editing an existing flare-up keeps its exact time ("custom"); a new one
  // starts on "Now" and re-reads the clock at save, so a form left open
  // doesn't save a stale time.
  const [timeChoice, setTimeChoice] = useState<TimeChoice>(defaultValues ? 'custom' : 'now');
  const [pickerStep, setPickerStep] = useState<'datetime' | 'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const { control, handleSubmit, setValue } = useForm<FlareUpFormData>({
    resolver: zodResolver(flareUpSchema),
    defaultValues: defaultValues ?? emptyDefaults(),
  });

  const occurredAt = useWatch({ control, name: 'occurred_at' });
  const symptoms = useWatch({ control, name: 'symptoms' });
  const status = useWatch({ control, name: 'status' });
  const hasUrgentSymptom = symptoms.some((symptom) => FLARE_URGENT_SYMPTOMS.includes(symptom));

  const occurredDate = parseISO(occurredAt);
  const occurredLabel = `${isToday(occurredDate)
    ? t('flareUp.today')
    : isYesterday(occurredDate)
      ? t('flareUp.yesterday')
      : formatShortDayLabel(occurredDate, locale)
    }, ${format(occurredDate, 'HH:mm')}`;

  const choosePreset = (id: TimeChoice, hoursAgo: number) => {
    haptics.tick();
    setTimeChoice(id);
    setValue('occurred_at', subHours(new Date(), hoursAgo).toISOString(), { shouldDirty: true });
  };

  // iOS gets one inline date+time calendar; Android's native dialogs can't do
  // both at once, so it's date, then time.
  const openCustomTime = () => {
    haptics.tick();
    setPendingDate(occurredDate);
    setPickerStep(Platform.OS === 'ios' ? 'datetime' : 'date');
  };

  const confirmPicker = (picked: Date) => {
    if (pickerStep === 'date') {
      setPendingDate(picked);
      setPickerStep('time');
      return;
    }
    const next = new Date(picked);
    if (pickerStep === 'time' && pendingDate) {
      next.setFullYear(pendingDate.getFullYear(), pendingDate.getMonth(), pendingDate.getDate());
    }
    const clamped = next > new Date() ? new Date() : next;
    setPickerStep(null);
    setTimeChoice('custom');
    setValue('occurred_at', clamped.toISOString(), { shouldDirty: true });
  };

  const handleSave = async (data: FlareUpFormData) => {
    setIsSubmitting(true);
    const preset = FLARE_TIME_PRESETS.find((p) => p.id === timeChoice);
    const result = await onSubmit({
      ...data,
      occurred_at: preset ? subHours(new Date(), preset.hoursAgo).toISOString() : data.occurred_at,
      // Older readers (AI prompts, the follow-up question, the visit PDF)
      // still read the single `likely_cause` text.
      likely_cause: data.triggers.length > 0 ? data.triggers.join(', ') : null,
      description: data.description?.trim() ? data.description.trim() : null,
    });

    if (!result) {
      // Save was intentionally short-circuited — just reset, no error/success UI.
      setIsSubmitting(false);
      return;
    }

    if (result.error) {
      setIsSubmitting(false);
      toast.error(result.error);
      return;
    }

    // No success animation on the button itself — the toast shown by onSaved
    // (via toast.success) already plays the checkmark, ToastModalHost.tsx.
    setIsSubmitting(false);
    onSaved?.();
  };

  const areaOptions = FLARE_AREA_OPTIONS.map((value) => ({ value, label: t(FLARE_AREA_LABEL_KEYS[value]) }));
  const symptomOptions = FLARE_SYMPTOM_OPTIONS.map((value) => ({ value, label: t(FLARE_SYMPTOM_LABEL_KEYS[value]) }));
  const triggerOptions = FLARE_TRIGGER_ORDER.map((value) => ({ value, label: t(TRIGGER_LABEL_KEYS[value]) }));

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-backgroundDark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View className="gap-3">
          <SectionTitle
            title={t('flareUp.occurredAt')}
            right={<Text className="text-caption text-inkSecondary dark:text-gray">{occurredLabel}</Text>}
          />
          <View className="flex-row flex-wrap gap-2.5">
            {FLARE_TIME_PRESETS.map((preset) => (
              <PillChip
                key={preset.id}
                label={t(preset.labelKey)}
                selected={timeChoice === preset.id}
                onPress={() => choosePreset(preset.id, preset.hoursAgo)}
              />
            ))}
            <PillChip
              label={t('flareUp.timeOther')}
              icon="time-outline"
              selected={timeChoice === 'custom'}
              onPress={openCustomTime}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="pain_level"
          render={({ field: { value, onChange } }) => (
            <ScaleSliderCard preset="pain" title={t('flareUp.severityQuestion')} value={value} onChange={onChange} />
          )}
        />

        <View className="gap-3">
          <SectionTitle title={t('flareUp.stillOngoingQuestion')} />
          <Controller
            control={control}
            name="status"
            render={({ field: { value, onChange } }) => (
              <View className="flex-row rounded-2xl bg-segmentTrack p-1 dark:bg-segmentTrackDark">
                {FLARE_UP_STATUS_OPTIONS.map((option) => {
                  const isActive = value === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        if (isActive) return;
                        haptics.tick();
                        onChange(option.value);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      className="h-12 flex-1 items-center justify-center rounded-xl"
                    >
                      {/* Always-rendered pill; only its opacity changes. */}
                      <View
                        className="absolute inset-0 rounded-xl bg-surface shadow-sm dark:bg-surfaceDark"
                        style={{ opacity: isActive ? 1 : 0 }}
                      />
                      <Text
                        className="text-label text-ink dark:text-white"
                        style={{ fontWeight: isActive ? '700' : '400', opacity: isActive ? 1 : 0.7 }}
                      >
                        {t(option.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
          {status === 'ongoing' && (
            <Text className="px-1 text-caption text-inkSecondary dark:text-gray">{t('flareUp.ongoingHint')}</Text>
          )}
        </View>

        <View className="gap-3">
          <SectionTitle title={t('flareUp.areasQuestion')} />
          <Controller
            control={control}
            name="pain_areas"
            render={({ field: { value, onChange } }) => (
              <ChoiceChips options={areaOptions} value={value} onChange={onChange} />
            )}
          />
        </View>

        <View className="gap-3">
          <SectionTitle title={t('flareUp.symptomsQuestion')} optional />
          <Controller
            control={control}
            name="symptoms"
            render={({ field: { value, onChange } }) => (
              <ChoiceChips options={symptomOptions} value={value} onChange={onChange} />
            )}
          />
          {hasUrgentSymptom && (
            <View
              accessibilityRole="alert"
              className="gap-2 rounded-2xl border border-[#F0C6C0] bg-[#FDEEEC] p-4 dark:border-[#5A2A25] dark:bg-[#2A1715]"
            >
              <View className="flex-row gap-3">
                <Ionicons name="warning-outline" size={22} color="#B42318" />
                <Text className="flex-1 text-body text-ink dark:text-white">
                  {t('flareUp.urgentWarning')}
                </Text>
              </View>
              <Pressable
                onPress={() => void Linking.openURL('tel:112')}
                accessibilityRole="link"
                hitSlop={8}
                className="self-start pl-9"
              >
                <Text className="text-label font-bold text-red-700 dark:text-red-400">{t('flareUp.call112')}</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className="gap-3">
          <SectionTitle title={t('flareUp.triggersQuestion')} optional />
          <Controller
            control={control}
            name="triggers"
            render={({ field: { value, onChange } }) => (
              <ChoiceChips
                options={triggerOptions}
                value={value}
                onChange={onChange}
                allowCustom
                customPlaceholder={t('checkin.addCustomPlaceholder')}
              />
            )}
          />
        </View>

        <View className="gap-3">
          <SectionTitle title={t('flareUp.notesLabel')} optional />
          <Controller
            control={control}
            name="description"
            render={({ field: { value, onChange, onBlur } }) => (
              <SettingsTextArea
                value={value ?? ''}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={t('flareUp.notesPlaceholder')}
                accessibilityLabel={t('flareUp.notesLabel')}
              />
            )}
          />
        </View>
      </ScrollView>

      <View
        className="border-t border-borderLight bg-background px-5 pt-3 dark:border-borderDark dark:bg-backgroundDark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <Pressable
          onPress={handleSubmit(handleSave)}
          disabled={isSubmitting}
          accessibilityRole="button"
          className="h-14 items-center justify-center rounded-2xl bg-accent dark:bg-primaryDark"
          style={{ opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-nav text-white">{submitLabel}</Text>
          )}
        </Pressable>
      </View>

      <DateTimePickerModal
        isVisible={pickerStep !== null}
        mode={pickerStep === 'datetime' ? 'datetime' : pickerStep === 'time' ? 'time' : 'date'}
        display={pickerStep === 'datetime' ? 'inline' : 'default'}
        date={pendingDate ?? occurredDate}
        maximumDate={new Date()}
        locale={PICKER_LOCALES[locale]}
        confirmTextIOS={t('injuryInfo.confirmDate')}
        cancelTextIOS={t('common.cancel')}
        accentColor={colors.accent}
        buttonTextColorIOS={colors.accent}
        isDarkModeEnabled={isDark}
        themeVariant={isDark ? 'dark' : 'light'}
        onConfirm={confirmPicker}
        onCancel={() => setPickerStep(null)}
      />
    </KeyboardAvoidingView>
  );
}
