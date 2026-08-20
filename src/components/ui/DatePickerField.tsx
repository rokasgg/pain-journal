import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

export interface DatePickerFieldProps {
  label?: string;
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  className?: string;
  labelClassName?: string;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder,
  maximumDate,
  className,
  labelClassName,
}: DatePickerFieldProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('datePicker.selectDate');
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(() => (value ? parseISO(value) : new Date()));

  const openPicker = () => {
    setPendingDate(value ? parseISO(value) : new Date());
    setShowPicker(true);
  };

  return (
    <View className={`gap-1.5 ${className ?? ''}`}>
      {label && (
        <Text className={`text-sm font-medium text-strongGray dark:text-white ${labelClassName ?? ''}`}>
          {label}
        </Text>
      )}

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        className="rounded-lg bg-white border border-gray px-4 py-3 dark:border-gray"
      >
        <Text className={value ? 'text-strongGray dark:text-white' : 'text-gray'}>
          {value ? format(parseISO(value), 'EEE, MMM d yyyy') : resolvedPlaceholder}
        </Text>
      </Pressable>

      {showPicker && Platform.OS === 'ios' && (
        <View className="rounded-lg border border-gray dark:border-gray">
          <DateTimePicker
            value={pendingDate}
            mode="date"
            display="spinner"
            maximumDate={maximumDate}
            onValueChange={(_event, selectedDate) => setPendingDate(selectedDate)}
          />
          <View className="flex-row border-t border-gray dark:border-gray">
            <Pressable
              onPress={() => setShowPicker(false)}
              accessibilityRole="button"
              className="flex-1 items-center border-r border-gray py-2.5 dark:border-gray"
            >
              <Text className="text-strongGray dark:text-white">{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onChange(format(pendingDate, 'yyyy-MM-dd'));
                setShowPicker(false);
              }}
              accessibilityRole="button"
              className="flex-1 items-center py-2.5"
            >
              <Text className="font-semibold text-strongGray dark:text-white">{t('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showPicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          maximumDate={maximumDate}
          onValueChange={(_event, selectedDate) => {
            setShowPicker(false);
            onChange(format(selectedDate, 'yyyy-MM-dd'));
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}
    </View>
  );
}
