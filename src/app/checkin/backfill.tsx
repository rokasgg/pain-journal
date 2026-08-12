import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { useCheckinsForDate, useUpsertCheckin } from '@/hooks/useCheckins';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { CheckinType } from '@/types/database.types';
import { toast } from '@/utils/toast';

export default function BackfillModal() {
  const router = useRouter();
  const { t } = useTranslation();
  const upsertCheckin = useUpsertCheckin();
  const [checkinDate, setCheckinDate] = useState<string>(todayLocalDate());
  const [checkinType, setCheckinType] = useState<CheckinType>('morning');
  const [showAlreadyLoggedModal, setShowAlreadyLoggedModal] = useState(false);

  const { checkins: checkinsForDate } = useCheckinsForDate(checkinDate);
  const existingCheckin = checkinsForDate.find((checkin) => checkin.type === checkinType);

  const handleSubmit = async (data: CheckinFormData) => {
    if (existingCheckin) {
      setShowAlreadyLoggedModal(true);
      return;
    }

    const { error } = await upsertCheckin.mutateAsync({
      type: checkinType,
      checkin_date: checkinDate,
      ...data,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('checkin.checkinUpdatedToast'));
    router.back();
  };

  return (
    <>
      <CheckinForm
        key={checkinType}
        type={checkinType}
        submitLabel={t('checkin.saveCheckin')}
        onSubmit={handleSubmit}
        header={
          <View className="gap-6">
            <DatePickerField
              label={t('checkin.dateLabel')}
              value={checkinDate}
              onChange={setCheckinDate}
              maximumDate={new Date()}
            />

            <View className="gap-2">
              <Text className="text-sm font-medium text-black dark:text-white">{t('checkin.typeLabel')}</Text>
              <View className="flex-row gap-2">
                {(['morning', 'evening'] as const).map((option) => {
                  const isActive = checkinType === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => setCheckinType(option)}
                      className={`flex-1 items-center rounded-lg py-2.5 ${
                        isActive ? 'bg-primary dark:bg-primaryDark' : 'bg-primaryMuted dark:bg-primaryMutedDark'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium capitalize ${
                          isActive ? 'text-white' : 'text-black dark:text-white'
                        }`}
                      >
                        {t(option === 'morning' ? 'home.morning' : 'home.evening')}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {existingCheckin && (
              <View className="rounded-lg bg-primaryMuted px-4 py-3 dark:bg-primaryMutedDark">
                <Text className="text-sm text-black dark:text-white">{t('checkin.alreadyLoggedWarning')}</Text>
              </View>
            )}
          </View>
        }
      />

      <ConfirmModal
        visible={showAlreadyLoggedModal}
        title={t('checkin.alreadyLoggedTitle')}
        message={t('checkin.alreadyLoggedMessage')}
        onConfirm={() => setShowAlreadyLoggedModal(false)}
      />
    </>
  );
}
