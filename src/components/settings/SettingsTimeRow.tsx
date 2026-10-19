import DateTimePicker from '@react-native-community/datetimepicker';
import type { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { clampTime, dateToTime, timeToDate } from '@/lib/time';
import { haptics } from '@/utils/haptics';

export interface SettingsTimeRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  iconTileClassName?: string;
  iconColor?: string;
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  // Inclusive "HH:mm" bounds; the picked time is clamped into them.
  minimumTime?: string;
  maximumTime?: string;
  disabled?: boolean;
  // Fired when the picker opens (e.g. so a preview can follow this row).
  onOpen?: () => void;
  // Injected by SettingsSection.
  isLast?: boolean;
}

// A settings row with a grey "HH:mm" time chip on the right (design from
// assets/possible-app-design/notifications). No free-text entry: iOS opens an
// inline spinner under the row with Cancel / Done (same pattern as
// DatePickerField); Android opens the native time dialog.
export function SettingsTimeRow({
  icon,
  title,
  iconTileClassName,
  iconColor,
  value,
  onChange,
  minimumTime,
  maximumTime,
  disabled = false,
  onOpen,
  isLast,
}: SettingsTimeRowProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(() => timeToDate(value));

  const open = () => {
    haptics.tick();
    setPending(timeToDate(value));
    setIsOpen(true);
    onOpen?.();
  };

  const commit = (date: Date) => {
    setIsOpen(false);
    const next = clampTime(dateToTime(date), minimumTime, maximumTime);
    if (next !== value) onChange(next);
  };

  const chip = (
    <Pressable
      onPress={open}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value}`}
      className="rounded-xl bg-borderLight px-4 py-2 active:opacity-70 dark:bg-borderDark"
    >
      <Text className="text-lg font-semibold text-black dark:text-white">{value}</Text>
    </Pressable>
  );

  const iosPicker =
    isOpen && Platform.OS === 'ios' ? (
      <View className="overflow-hidden rounded-xl border border-borderLight dark:border-borderDark">
        <DateTimePicker
          value={pending}
          mode="time"
          display="spinner"
          is24Hour
          minimumDate={minimumTime ? timeToDate(minimumTime, pending) : undefined}
          maximumDate={maximumTime ? timeToDate(maximumTime, pending) : undefined}
          onValueChange={(_event, selected) => setPending(selected)}
        />
        <View className="flex-row border-t border-borderLight dark:border-borderDark">
          <Pressable
            onPress={() => setIsOpen(false)}
            accessibilityRole="button"
            className="flex-1 items-center border-r border-borderLight py-2.5 dark:border-borderDark"
          >
            <Text className="text-strongGray dark:text-white">{t('common.cancel')}</Text>
          </Pressable>
          <Pressable onPress={() => commit(pending)} accessibilityRole="button" className="flex-1 items-center py-2.5">
            <Text className="font-semibold text-primary dark:text-white">{t('common.done')}</Text>
          </Pressable>
        </View>
      </View>
    ) : undefined;

  return (
    <>
      <SettingsRow
        icon={icon}
        title={title}
        iconTileClassName={iconTileClassName}
        iconColor={iconColor}
        accessory={chip}
        below={iosPicker}
        disabled={disabled}
        isLast={isLast}
      />
      {isOpen && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={pending}
          mode="time"
          is24Hour
          onValueChange={(_event, selected) => commit(selected)}
          onDismiss={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
