import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToastModalStore } from '@/store/useToastModalStore';

export function ToastModalHost() {
  const { t } = useTranslation();
  const visible = useToastModalStore((state) => state.visible);
  const message = useToastModalStore((state) => state.message);
  const variant = useToastModalStore((state) => state.variant);
  const hide = useToastModalStore((state) => state.hide);

  return (
    <ConfirmModal
      visible={visible}
      title={message}
      confirmLabel={t('common.done')}
      variant={variant}
      onConfirm={hide}
    />
  );
}
