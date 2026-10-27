import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { InfoButton } from '@/components/ui/InfoButton';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface SectionTitleProps {
  title: string;
  // Adds the small grey "neprivaloma" / "optional" next to the title.
  optional?: boolean;
  // Optional (i) popover next to the title.
  info?: string;
  right?: ReactNode;
}

// The bold question/section heading of the check-in steps, sized like the
// flare-up form's own headings (14px bold, 14px "optional") (design: assets/possible-app-design/check in - evening).
export function SectionTitle({ title, optional, info, right }: SectionTitleProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-baseline justify-between">
      <View className="flex-row items-baseline gap-2">
        <Text className="text-sm font-bold text-ink dark:text-white">{title}</Text>
        {optional && <Text className="text-sm text-inkSecondary dark:text-gray">{t('flareUp.optional')}</Text>}
        {info && <InfoButton title={title} message={info} />}
      </View>
      {right}
    </View>
  );
}
