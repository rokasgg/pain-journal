import type { ReactNode } from 'react';
import { View } from 'react-native';

export function WizardFooter({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-3 border-gray-200 bg-background px-6 py-12 dark:border-gray-800 dark:bg-backgroundDark">
      {children}
    </View>
  );
}
