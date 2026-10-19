import { useEffect } from 'react';

import { OptionSheet } from '@/components/ui/OptionSheet';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { haptics } from '@/utils/haptics';

type ConfirmModalVariant = 'default' | 'destructive';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Omit to render an informative single-option dialog (confirm doubles as close). */
  onCancel?: () => void;
  onConfirm: () => void;
  variant?: ConfirmModalVariant;
}

// Confirmation / informative dialog, rendered as the app's bottom option
// sheet (OptionSheet — design from assets/possible-app-design/modalmessage).
//  - Two-option mode (`onCancel` given): the title + message and the confirm
//    action in one card (red when destructive), "Cancel" in a separate card.
//  - Informative mode (no `onCancel`, e.g. InfoButton): the title + message
//    card, and the confirm label ("Done") as the bold bottom card.
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  variant = 'default',
}: ConfirmModalProps) {
  const { t } = useTranslation();

  // A destructive question (delete, sign out) should feel different from a
  // routine one before the user reads a word of it.
  useEffect(() => {
    if (visible && variant === 'destructive') haptics.warning();
  }, [visible, variant]);

  if (!onCancel) {
    return (
      <OptionSheet
        visible={visible}
        title={title}
        message={message}
        options={[]}
        cancelLabel={confirmLabel ?? t('common.done')}
        onCancel={onConfirm}
        onDismiss={onConfirm}
      />
    );
  }

  return (
    <OptionSheet
      visible={visible}
      title={title}
      message={message}
      options={[{ label: confirmLabel ?? t('common.done'), onPress: onConfirm, tone: variant }]}
      cancelLabel={cancelLabel ?? t('common.cancel')}
      onCancel={onCancel}
      onDismiss={onCancel}
    />
  );
}
