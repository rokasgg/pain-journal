import { Children, isValidElement, cloneElement, type ReactElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';

export interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

// Uppercase section header + one rounded card holding its rows (design from
// assets/possible-app-design/settings). Rows get `isLast` injected so only the
// dividers *between* rows are drawn.
export function SettingsSection({ title, children, className }: SettingsSectionProps) {
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<{ isLast?: boolean }>[];

  return (
    <View className={`gap-2.5 ${className ?? ''}`}>
      <Text className="px-1 text-sm font-semibold uppercase tracking-wide text-strongGray dark:text-gray">{title}</Text>
      <View className="overflow-hidden rounded-3xl bg-surface dark:bg-surfaceDark">
        {rows.map((row, index) => cloneElement(row, { key: row.key ?? index, isLast: index === rows.length - 1 }))}
      </View>
    </View>
  );
}
