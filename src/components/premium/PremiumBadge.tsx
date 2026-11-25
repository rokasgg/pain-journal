import { Ionicons } from '@expo/vector-icons';
import { View, type ViewProps } from 'react-native';

import { colors } from '@/lib/theme';

export interface PremiumBadgeProps extends ViewProps {
  size?: number;
  className?: string;
}

// Small lock pill for tiles/chips that open the paywall when tapped.
export function PremiumBadge({ size = 12, className, ...props }: PremiumBadgeProps) {
  return (
    <View
      className={`items-center justify-center rounded-full bg-accentMuted p-1 dark:bg-primaryMutedDark ${className ?? ''}`}
      {...props}
    >
      <Ionicons name="lock-closed" size={size} color={colors.accent} />
    </View>
  );
}
