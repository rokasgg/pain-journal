import type { Ionicons } from '@expo/vector-icons';

import { SettingsPickerRow } from '@/components/settings/SettingsPickerRow';
import { clampTime, dateToTime, timeToDate } from '@/lib/time';

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

// Time chip row for reminder times (design from
// assets/possible-app-design/notifications). Thin "HH:mm" wrapper over
// SettingsPickerRow; the picked time is clamped into [minimumTime, maximumTime].
export function SettingsTimeRow({ value, onChange, minimumTime, maximumTime, ...rest }: SettingsTimeRowProps) {
  const base = timeToDate(value);

  return (
    <SettingsPickerRow
      {...rest}
      mode="time"
      value={base}
      displayValue={value}
      minimumDate={minimumTime ? timeToDate(minimumTime, base) : undefined}
      maximumDate={maximumTime ? timeToDate(maximumTime, base) : undefined}
      onChange={(date) => {
        const next = clampTime(dateToTime(date), minimumTime, maximumTime);
        if (next !== value) onChange(next);
      }}
    />
  );
}
