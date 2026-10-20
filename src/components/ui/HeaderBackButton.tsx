import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

export interface HeaderBackButtonProps {
  // e.g. "Settings" — omit for a chevron-only back button.
  label?: string;
  color?: string;
}

// iOS header back button drawn by us instead of the system one, so it can sit
// on the header WITHOUT iOS 26's "Liquid Glass" bubble — iOS only lets you
// hide that shared background on custom bar items (`hidesSharedBackground`),
// not on the native back button. Wired globally from the root Stack's
// screenOptions; Android keeps its native back button (no bubble there).
export function HeaderBackButton({ label, color = colors.primary }: HeaderBackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label ?? t('common.back')}
      className="flex-row items-center active:opacity-50"
    >
      <Ionicons name="chevron-back" size={26} color={color} />
      {label && <Text className="text-lg text-primary dark:text-primaryDark">{label}</Text>}
    </Pressable>
  );
}
