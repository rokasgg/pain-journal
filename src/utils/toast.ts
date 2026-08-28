import { useToastModalStore } from '@/store/useToastModalStore';

export const toast = {
  success: (message: string) => useToastModalStore.getState().show(message, 'success'),
  error: (message: string) => useToastModalStore.getState().show(message, 'destructive'),
  info: (message: string) => useToastModalStore.getState().show(message, 'info'),
};
