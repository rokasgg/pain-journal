import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { Profile } from '@/types/database.types';
import { toast } from '@/utils/toast';

interface InjuryInfoFormProps {
  profile: Profile | null;
}

// Keyed by `profile?.id` from the parent so this remounts (with fresh
// defaultValues) the moment the profile query resolves, instead of trying to
// sync local state into an already-mounted form — that "sync on render"
// approach proved unreliable here (see settings.tsx history).
function InjuryInfoForm({ profile }: InjuryInfoFormProps) {
  const { t } = useTranslation();
  const updateProfileMutation = useUpdateProfile();
  const [injuryStartedOn, setInjuryStartedOn] = useState<string | null>(
    profile?.injury_started_on ?? null,
  );
  const [injuryDescription, setInjuryDescription] = useState(profile?.injury_description ?? '');
  const [healingStartedOn, setHealingStartedOn] = useState<string | null>(
    profile?.healing_started_on ?? null,
  );

  const handleSave = async () => {
    const { error } = await updateProfileMutation.mutateAsync({
      injury_started_on: injuryStartedOn || null,
      injury_description: injuryDescription || null,
      healing_started_on: healingStartedOn || null,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('settings.injuryInfoUpdated'));
  };

  return (
    <View className="gap-3">
      <DatePickerField
        label={t('settings.injuryStartDate')}
        value={injuryStartedOn}
        onChange={setInjuryStartedOn}
        maximumDate={new Date()}
      />
      <DatePickerField
        label={t('settings.healingStartDate')}
        value={healingStartedOn}
        onChange={setHealingStartedOn}
        maximumDate={new Date()}
      />
      <Input
        label={t('settings.description')}
        placeholder={t('settings.whatHappenedPlaceholder')}
        multiline
        numberOfLines={3}
        value={injuryDescription}
        onChangeText={setInjuryDescription}
      />

      <Pressable
        onPress={handleSave}
        disabled={updateProfileMutation.isPending}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {updateProfileMutation.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">{t('settings.saveInjuryInfo')}</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function InjuryInfoScreen() {
  const { profile, isLoading } = useProfile();

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      {isLoading ? <ActivityIndicator /> : <InjuryInfoForm key={profile?.id ?? 'none'} profile={profile} />}
    </ScrollView>
  );
}
