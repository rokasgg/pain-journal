import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface InfoButtonProps {
  title: string;
  message: string;
}

export function InfoButton({ title, message }: InfoButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => Alert.alert(title, message)}
      accessibilityRole="button"
      accessibilityLabel={t('infoButton.aboutLabel', { title })}
      hitSlop={8}
    >
      <Ionicons name="information-circle-outline" size={16} color={colors.gray} />
    </Pressable>
  );
}
