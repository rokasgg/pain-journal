import { create } from 'zustand';

type ToastModalVariant = 'default' | 'destructive';

interface ToastModalState {
  visible: boolean;
  message: string;
  variant: ToastModalVariant;
  show: (message: string, variant: ToastModalVariant) => void;
  hide: () => void;
}

export const useToastModalStore = create<ToastModalState>((set) => ({
  visible: false,
  message: '',
  variant: 'default',
  show: (message, variant) => set({ visible: true, message, variant }),
  hide: () => set({ visible: false }),
}));
