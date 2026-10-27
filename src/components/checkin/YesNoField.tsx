import { Text, View } from 'react-native';

import { SectionTitle } from '@/components/ui/SectionTitle';
import { SegmentedChoice } from '@/components/ui/SegmentedChoice';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface YesNoFieldProps {
  label: string;
  // null = not answered yet — neither option is highlighted.
  value: boolean | null;
  onChange: (value: boolean) => void;
  info?: string;
  // Inline required-answer message (e.g. a check-in step's "Answer this to continue").
  error?: string;
  className?: string;
}

// Two explicit options, deliberately not a Switch: a switch has no "not
// answered" state, so Off would silently mean No — which is how untouched
// check-ins used to save as pain-free days.
export function YesNoField({ label, value, onChange, info, error, className }: YesNoFieldProps) {
  const { t } = useTranslation();

  return (
    <View className={`gap-3 ${className ?? ''}`}>
      <SectionTitle title={label} info={info} />
      <SegmentedChoice<boolean>
        options={[
          { value: true, label: t('common.yes') },
          { value: false, label: t('common.no') },
        ]}
        value={value}
        onChange={onChange}
        accessibilityLabel={label}
        hasError={!!error}
      />
      {error && <Text className="text-sm text-red-600 dark:text-red-500">{error}</Text>}
    </View>
  );
}
