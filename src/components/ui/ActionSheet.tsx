import { OptionSheet } from '@/components/ui/OptionSheet';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface ActionSheetAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  actions: ActionSheetAction[];
  onCancel: () => void;
  cancelLabel?: string;
}

// Long-press Edit / Delete menus — same bottom option-sheet look as every
// confirmation (OptionSheet, design from assets/possible-app-design/modalmessage).
export function ActionSheet({ visible, actions, onCancel, cancelLabel }: ActionSheetProps) {
  const { t } = useTranslation();

  return (
    <OptionSheet
      visible={visible}
      options={actions.map((action) => ({
        label: action.label,
        onPress: action.onPress,
        tone: action.destructive ? 'destructive' : 'default',
      }))}
      cancelLabel={cancelLabel ?? t('common.cancel')}
      onCancel={onCancel}
      onDismiss={onCancel}
    />
  );
}
