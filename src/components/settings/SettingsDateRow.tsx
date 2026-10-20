import type { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Pressable, Text, useColorScheme } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { currentDateFnsLocale } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

// Native picker locale per app locale, so month names match the UI language.
const PICKER_LOCALES = { en: 'en-GB', lt: 'lt-LT' } as const;

export interface SettingsDateRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  // Screen-reader name for the date, e.g. "Traumos data" → "Traumos data, 19 spalio 2026".
  accessibilityName: string;
  iconTileClassName?: string;
  iconColor?: string;
  value: string | null; // local "yyyy-MM-dd" or null when unset
  placeholder: string;
  onChange: (date: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  // Injected by SettingsSection.
  isLast?: boolean;
}

// Date pill row ("19 spal. 2026") for profile dates (design from
// assets/possible-app-design/injury). Tapping the pill opens a modal native
// picker (iOS: inline calendar; Android: the native dialog); confirm commits,
// cancel / tapping outside changes nothing. Dates are local calendar days
// (format, never toISOString, see lib/dates.ts).
export function SettingsDateRow({
  icon,
  title,
  accessibilityName,
  iconTileClassName,
  iconColor,
  value,
  placeholder,
  onChange,
  minimumDate,
  maximumDate,
  disabled = false,
  isLast,
}: SettingsDateRowProps) {
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const date = value ? parseISO(value) : null;
  const dateLocale = currentDateFnsLocale();

  const open = () => {
    haptics.tick();
    setIsOpen(true);
  };

  const confirm = (picked: Date) => {
    setIsOpen(false);
    const next = format(picked, 'yyyy-MM-dd');
    if (next !== value) onChange(next);
  };

  const pill = (
    <Pressable
      onPress={open}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityName}, ${date ? format(date, 'd MMMM yyyy', { locale: dateLocale }) : t('injuryInfo.dateNotSet')
        }`}
      className="min-h-11 justify-center rounded-xl bg-accentMuted px-4 active:opacity-70 dark:bg-primaryDark/25"
    >
      {/* Keyed so empty ↔ set remounts the Text instead of swapping its colour
          class on a mounted element (NativeWind upgrade gotcha, CLAUDE.md). */}
      {date ? (
        <Text key="set" className="text-sm font-semibold text-black dark:text-white">
          {format(date, 'd MMM yyyy', { locale: dateLocale })}
        </Text>
      ) : (
        <Text key="empty" className="text-sm font-semibold text-accent dark:text-white">
          {placeholder}
        </Text>
      )}
    </Pressable>
  );

  return (
    <>
      <SettingsRow
        icon={icon}
        title={title}
        iconTileClassName={iconTileClassName}
        iconColor={iconColor}
        accessory={pill}
        disabled={disabled}
        isLast={isLast}
      />
      <DateTimePickerModal
        isVisible={isOpen}
        mode="date"
        display="inline"
        date={date ?? maximumDate ?? new Date()}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        locale={PICKER_LOCALES[locale]}
        confirmTextIOS={t('injuryInfo.confirmDate')}
        cancelTextIOS={t('common.cancel')}
        accentColor={colors.accent}
        buttonTextColorIOS={colors.accent}
        isDarkModeEnabled={isDark}
        themeVariant={isDark ? 'dark' : 'light'}
        onConfirm={confirm}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}
