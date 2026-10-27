import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, useColorScheme, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ChoiceChipsProps {
  options: ChoiceOption[];
  value: string[];
  onChange: (value: string[]) => void;
  // Adds a dashed "+ Kita" chip that lets the user type their own entry.
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export interface PillChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  // Selected multi-select chips show a ✓; single-select time chips don't.
  showCheck?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

// One pill. Colours come from `style`, never className swaps: a chip that
// gains `bg-accent` (a CSS variable) on select would be "upgraded" by
// NativeWind and remounted (see the Visual Design System gotcha). The
// light/dark pairs use useColorScheme for the same reason.
export function PillChip({ label, selected, onPress, showCheck = false, icon }: PillChipProps) {
  const isDark = useColorScheme() === 'dark';
  const selectedFill = isDark ? colors.primaryDark : colors.accent;
  const idleFill = isDark ? colors.surfaceDark : '#FFFFFF';
  const idleBorder = isDark ? colors.borderDark : colors.borderLight;
  const idleText = isDark ? colors.white : colors.ink;
  const textColor = selected ? colors.white : idleText;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="flex-row items-center gap-1.5 rounded-full border px-4 py-2.5"
      style={{
        backgroundColor: selected ? selectedFill : idleFill,
        borderColor: selected ? selectedFill : idleBorder,
      }}
    >
      {showCheck && selected && <Ionicons name="checkmark" size={16} color={colors.white} />}
      {icon && <Ionicons name={icon} size={16} color={selected ? colors.white : selectedFill} />}
      <Text className="text-label font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </Pressable>
  );
}

// Multi-select pill chips (design: assets/possible-app-design/flareups). A
// selected chip is filled accent green with a ✓; the rest are white with a
// hairline border. Colours come from `style`, never className swaps: a chip
// that gains `bg-accent` (a CSS variable) on select would be "upgraded" by
// NativeWind and remounted (see the Visual Design System gotcha). The
// light/dark pairs use useColorScheme for the same reason.
export function ChoiceChips({ options, value, onChange, allowCustom = false, customPlaceholder }: ChoiceChipsProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const [isAdding, setIsAdding] = useState(false);
  const [customText, setCustomText] = useState('');

  const selectedFill = isDark ? colors.primaryDark : colors.accent;
  const idleFill = isDark ? colors.surfaceDark : '#FFFFFF';

  const known = new Set(options.map((o) => o.value));
  const customValues = value.filter((v) => !known.has(v));
  const items: ChoiceOption[] = [...options, ...customValues.map((v) => ({ value: v, label: v }))];

  const toggle = (item: string) => {
    haptics.tick();
    onChange(value.includes(item) ? value.filter((v) => v !== item) : [...value, item]);
  };

  const addCustom = () => {
    const trimmed = customText.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setCustomText('');
    setIsAdding(false);
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2.5">
        {items.map((item) => (
          <PillChip
            key={item.value}
            label={item.label}
            selected={value.includes(item.value)}
            onPress={() => toggle(item.value)}
            showCheck
          />
        ))}

        {allowCustom && !isAdding && (
          <Pressable
            onPress={() => setIsAdding(true)}
            accessibilityRole="button"
            className="flex-row items-center gap-1 rounded-full border px-4 py-2.5"
            style={{ borderColor: selectedFill, backgroundColor: idleFill, opacity: 0.9 }}
          >
            <Ionicons name="add" size={16} color={selectedFill} />
            <Text className="text-label font-semibold" style={{ color: selectedFill }}>
              {t('flareUp.addOther')}
            </Text>
          </Pressable>
        )}
      </View>

      {allowCustom && isAdding && (
        <View className="flex-row items-center gap-2">
          <TextInput
            autoFocus
            value={customText}
            onChangeText={setCustomText}
            onSubmitEditing={addCustom}
            placeholder={customPlaceholder}
            placeholderTextColor={colors.gray}
            returnKeyType="done"
            className="flex-1 rounded-xl border border-borderLight bg-surface px-4 py-2.5 text-body text-ink dark:border-borderDark dark:bg-surfaceDark dark:text-white"
          />
          <Pressable
            onPress={addCustom}
            accessibilityRole="button"
            className="rounded-xl bg-accent px-4 py-2.5 dark:bg-primaryDark"
          >
            <Text className="text-label font-semibold text-white">{t('common.add')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCustomText('');
              setIsAdding(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          >
            <Ionicons name="close" size={22} color={colors.gray} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
