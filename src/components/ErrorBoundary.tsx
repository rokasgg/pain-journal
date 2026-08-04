import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Plain functional component so the fallback UI can use the useTranslation()
// hook — the outer class component can't call hooks itself, only render()
// into one.
function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6 dark:bg-backgroundDark">
      <Text className="text-center text-lg font-semibold text-black dark:text-white">
        {t('errorBoundary.title')}
      </Text>
      <Pressable
        onPress={onReset}
        className="items-center rounded-lg bg-primary px-6 py-3 dark:bg-primaryDark"
      >
        <Text className="font-semibold text-white dark:text-black">{t('errorBoundary.tryAgain')}</Text>
      </Pressable>
    </View>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.reset} />;
    }

    return this.props.children;
  }
}
