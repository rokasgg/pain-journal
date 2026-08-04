import { useToastModalStore } from '@/store/useToastModalStore';

export const toast = {
  success: (message: string) => useToastModalStore.getState().show(message, 'default'),
  error: (message: string) => useToastModalStore.getState().show(message, 'destructive'),
  info: (message: string) => useToastModalStore.getState().show(message, 'default'),
};
