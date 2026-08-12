import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

export interface DateTimePickerFieldProps {
  label?: string;
  value: string;
  onChange: (isoDateTime: string) => void;
  maximumDate?: Date;
  className?: string;
  labelClassName?: string;
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  maximumDate,
  className,
  labelClassName,
}: DateTimePickerFieldProps) {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => parseISO(value));

  const openPicker = () => {
    setPendingDate(parseISO(value));
    setShowPicker(true);
  };

  return (
    <View className={`gap-1.5 ${className ?? ''}`}>
      {label && (
        <Text className={`text-sm font-medium text-black dark:text-white ${labelClassName ?? ''}`}>
          {label}
        </Text>
      )}

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        className="rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-700"
      >
        <Text className="text-black dark:text-white">{format(parseISO(value), 'EEE, MMM d yyyy HH:mm')}</Text>
      </Pressable>

      {showPicker && Platform.OS === 'ios' && (
        <View className="rounded-lg border border-gray-300 dark:border-gray-700">
          <DateTimePicker
            value={pendingDate}
            mode="datetime"
            display="spinner"
            maximumDate={maximumDate}
            onValueChange={(_event, selectedDate) => setPendingDate(selectedDate)}
          />
          <View className="flex-row border-t border-gray-300 dark:border-gray-700">
            <Pressable
              onPress={() => setShowPicker(false)}
              accessibilityRole="button"
              className="flex-1 items-center border-r border-gray-300 py-2.5 dark:border-gray-700"
            >
              <Text className="text-black dark:text-white">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onChange(pendingDate.toISOString());
                setShowPicker(false);
              }}
              accessibilityRole="button"
              className="flex-1 items-center py-2.5"
            >
              <Text className="font-semibold text-black dark:text-white">{t('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showPicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={pendingDate}
          mode="datetime"
          maximumDate={maximumDate}
          onValueChange={(_event, selectedDate) => {
            setShowPicker(false);
            onChange(selectedDate.toISOString());
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}
    </View>
  );
}
