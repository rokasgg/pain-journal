import type { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

import { SettingsPickerRow } from '@/components/settings/SettingsPickerRow';
import { currentDateFnsLocale } from '@/lib/dates';

export interface SettingsDateRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
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

// Date chip row ("4 Aug 2026") for profile dates (design from
// assets/possible-app-design/injury). Thin "yyyy-MM-dd" wrapper over
// SettingsPickerRow — dates are local calendar days (format, never
// toISOString, see lib/dates.ts).
export function SettingsDateRow({ value, onChange, ...rest }: SettingsDateRowProps) {
  const date = value ? parseISO(value) : null;

  return (
    <SettingsPickerRow
      {...rest}
      mode="date"
      value={date}
      displayValue={date ? format(date, 'd MMM yyyy', { locale: currentDateFnsLocale() }) : ''}
      onChange={(picked) => {
        const next = format(picked, 'yyyy-MM-dd');
        if (next !== value) onChange(next);
      }}
    />
  );
}
