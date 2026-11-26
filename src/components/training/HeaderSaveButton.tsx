import { ActivityIndicator, Pressable, Text } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface HeaderSaveButtonProps {
  onPress: () => void;
  enabled: boolean;
  isSaving: boolean;
}

// "Save" for a header's right side (spread through headerRightWithoutGlass).
// The disabled look is applied via `style`, never a toggled class (the
// NativeWind upgrade gotcha in CLAUDE.md).
export function HeaderSaveButton({ onPress, enabled, isSaving }: HeaderSaveButtonProps) {
  const { t } = useTranslation();
  if (isSaving) return <ActivityIndicator color={colors.primary} />;
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      style={{ opacity: enabled ? 1 : 0.4 }}
    >
      <Text className="text-base font-bold text-primary dark:text-white">{t('common.save')}</Text>
    </Pressable>
  );
}
