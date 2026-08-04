import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface InfoButtonProps {
  title: string;
  message: string;
}

export function InfoButton({ title, message }: InfoButtonProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setIsVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('infoButton.aboutLabel', { title })}
        hitSlop={8}
      >
        <Ionicons name="information-circle-outline" size={16} color={colors.gray} />
      </Pressable>

      <ConfirmModal
        visible={isVisible}
        title={title}
        message={message}
        confirmLabel={t('common.done')}
        onConfirm={() => setIsVisible(false)}
      />
    </>
  );
}
