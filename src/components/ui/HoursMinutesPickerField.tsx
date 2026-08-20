import { Picker } from '@react-native-picker/picker';
import { useState } from 'react';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface HoursMinutesPickerFieldProps {
  label?: string;
  /** Duration in decimal hours, e.g. 1.5 for 1h 30m. */
  value: number | null;
  onChange: (hours: number) => void;
  maxHours?: number;
  minuteStep?: number;
  placeholder?: string;
  info?: string;
  className?: string;
  labelClassName?: string;
}

function toParts(value: number | null) {
  const totalMinutes = Math.round((value ?? 0) * 60);
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

export function HoursMinutesPickerField({
  label,
  value,
  onChange,
  maxHours = 12,
  minuteStep = 15,
  placeholder,
  info,
  className,
  labelClassName,
}: HoursMinutesPickerFieldProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const [showPicker, setShowPicker] = useState(false);
  const [pending, setPending] = useState(() => toParts(value));

  const hourOptions = Array.from({ length: maxHours + 1 }, (_, i) => i);
  const minuteOptions = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
  const itemStyle = { color: isDark ? colors.white : colors.black, fontSize: 18 };

  const openPicker = () => {
    setPending(toParts(value));
    setShowPicker(true);
  };

  const displayed = toParts(value);
  const displayText = displayed.minutes === 0 ? `${displayed.hours}h` : `${displayed.hours}h ${displayed.minutes}m`;

  return (
    <View className={`gap-1.5 ${className ?? ''}`}>
      {label && (
        <View className="flex-row items-center gap-1.5">
          <Text className={`text-sm font-medium text-strongGray dark:text-white ${labelClassName ?? ''}`}>{label}</Text>
          {info && <InfoButton title={label} message={info} />}
        </View>
      )}

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        className="rounded-lg border border-gray px-4 py-3 dark:border-gray bg-white dark:bg-gray"
      >
        <Text className={value !== null ? 'text-strongGrat dark:text-white' : 'text-gray'}>
          {value !== null ? displayText : (placeholder ?? t('common.select'))}
        </Text>
      </Pressable>

      {showPicker && (
        <View className="overflow-hidden rounded-lg border border-gray dark:border-gray">
          <View className="flex-row" style={{ height: 200 }}>
            <Picker
              style={{ flex: 1 }}
              itemStyle={itemStyle}
              selectedValue={pending.hours}
              onValueChange={(next) => setPending((prev) => ({ ...prev, hours: Number(next) }))}
            >
              {hourOptions.map((hours) => (
                <Picker.Item key={hours} label={t('checkin.hoursOption', { hours })} value={hours} />
              ))}
            </Picker>
            <Picker
              style={{ flex: 1 }}
              itemStyle={itemStyle}
              selectedValue={pending.minutes}
              onValueChange={(next) => setPending((prev) => ({ ...prev, minutes: Number(next) }))}
            >
              {minuteOptions.map((minutes) => (
                <Picker.Item key={minutes} label={t('checkin.minutesOption', { minutes })} value={minutes} />
              ))}
            </Picker>
          </View>
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
                onChange(pending.hours + pending.minutes / 60);
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
    </View>
  );
}
