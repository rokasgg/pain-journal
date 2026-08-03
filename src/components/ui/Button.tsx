import { Pressable, Text, type PressableProps } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary dark:bg-primaryDark active:opacity-90',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-gray-200 active:bg-gray-300',
    text: 'text-gray-900',
  },
  outline: {
    container: 'border border-blue-600 bg-transparent active:bg-blue-50',
    text: 'text-blue-600',
  },
};

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  className?: string;
  textClassName?: string;
}

export function Button({
  title,
  variant = 'primary',
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`items-center justify-center rounded-lg px-4 py-3 ${styles.container} ${disabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...props}>
      <Text className={`text-base font-semibold ${styles.text} ${textClassName ?? ''}`}>{title}</Text>
    </Pressable>
  );
}
