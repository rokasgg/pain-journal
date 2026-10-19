import type { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

export interface SettingsPickerRowProps {
  mode: 'date' | 'time';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  iconTileClassName?: string;
  iconColor?: string;
  // null = not set yet; the chip shows `placeholder`.
  value: Date | null;
  // What the chip shows when a value is set (caller formats it).
  displayValue: string;
  placeholder?: string;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  onOpen?: () => void;
  // Injected by SettingsSection.
  isLast?: boolean;
}

// A settings row with a grey value chip on the right that opens a native
// picker — iOS: inline spinner under the row with Cancel / Done (same
// pattern as DatePickerField); Android: the native dialog. No free-text
// entry. Shared by SettingsTimeRow (reminder times) and SettingsDateRow
// (injury/healing dates).
export function SettingsPickerRow({
  mode,
  icon,
  title,
  iconTileClassName,
  iconColor,
  value,
  displayValue,
  placeholder,
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  onOpen,
  isLast,
}: SettingsPickerRowProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<Date>(() => value ?? new Date());

  const open = () => {
    haptics.tick();
    setPending(value ?? maximumDate ?? new Date());
    setIsOpen(true);
    onOpen?.();
  };

  const commit = (selected: Date) => {
    setIsOpen(false);
    onChange(selected);
  };

  const chip = (
    <Pressable
      onPress={open}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${value ? displayValue : (placeholder ?? '')}`}
      className="rounded-xl bg-borderLight px-4 py-2 active:opacity-70 dark:bg-borderDark"
    >
      {/* Placeholder dimmed via style, not a swapped colour class (NativeWind
          upgrade gotcha, CLAUDE.md). */}
      <Text className="text-sm font-semibold text-black dark:text-white" style={value ? undefined : { opacity: 0.45 }}>
        {value ? displayValue : placeholder}
      </Text>
    </Pressable>
  );

  const iosPicker =
    isOpen && Platform.OS === 'ios' ? (
      <View className="overflow-hidden rounded-xl border border-borderLight dark:border-borderDark">
        <DateTimePicker
          value={pending}
          mode={mode}
          display="spinner"
          is24Hour
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
          mode={mode}
          is24Hour
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_event, selected) => commit(selected)}
          onDismiss={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
