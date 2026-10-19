import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type RowTone = 'default' | 'destructive';

// Icon tile + text colours per tone — variant-map convention (CLAUDE.md).
const TONE_STYLES: Record<RowTone, { tile: string; title: string; icon: string }> = {
  default: { tile: 'bg-primary/10', title: 'text-black dark:text-white', icon: colors.primary },
  destructive: { tile: 'bg-red-100 dark:bg-red-950', title: 'text-red-600 dark:text-red-500', icon: '#dc2626' },
};

export interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  // Right-aligned current value, e.g. "English".
  value?: string;
  // Custom right-side control (e.g. a Switch). Replaces the chevron.
  accessory?: ReactNode;
  // Full-width content under the title row, inside the same card row
  // (e.g. the appearance segmented control).
  below?: ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  tone?: RowTone;
  // Injected by SettingsSection — hides the divider on the last row.
  isLast?: boolean;
  className?: string;
}

// One settings row: tinted icon tile, title (+ optional subtitle), and a
// chevron / value / custom accessory on the right. The divider starts after
// the icon tile, as in the design.
export function SettingsRow({
  icon,
  title,
  subtitle,
  value,
  accessory,
  below,
  onPress,
  showChevron = !!onPress && !accessory,
  tone = 'default',
  isLast,
  className,
}: SettingsRowProps) {
  const styles = TONE_STYLES[tone];

  const content = (
    <View className="flex-row gap-3.5 pl-4">
      <View className={`mt-3.5 h-9 w-9 items-center justify-center rounded-xl ${styles.tile}`}>
        <Ionicons name={icon} size={18} color={styles.icon} />
      </View>
      <View className={`flex-1 gap-3 py-3.5 pr-4 ${isLast ? '' : 'border-b border-borderLight dark:border-borderDark'}`}>
        <View className="min-h-9 flex-row items-center gap-3">
          <View className="flex-1 gap-0.5">
            <Text className={`text-base ${styles.title}`}>{title}</Text>
            {subtitle && <Text className="text-sm text-gray">{subtitle}</Text>}
          </View>
          {value && <Text className="text-base text-gray">{value}</Text>}
          {accessory}
          {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.gray} />}
        </View>
        {below}
      </View>
    </View>
  );

  if (!onPress) return <View className={className}>{content}</View>;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className={`active:opacity-60 ${className ?? ''}`}>
      {content}
    </Pressable>
  );
}
