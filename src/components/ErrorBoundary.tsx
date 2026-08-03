import { Component, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
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
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-background px-6 dark:bg-backgroundDark">
          <Text className="text-center text-lg font-semibold text-black dark:text-white">
            Something went wrong.
          </Text>
          <Pressable
            onPress={this.reset}
            className="items-center rounded-lg bg-primary px-6 py-3 dark:bg-primaryDark"
          >
            <Text className="font-semibold text-white dark:text-black">Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
