import { create } from 'zustand';

// 'success' gets the AnimatedCheckmark treatment in ToastModalHost; 'info'
// and 'destructive' don't (info isn't a completion, destructive is an error).
type ToastModalVariant = 'success' | 'info' | 'destructive';

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
  variant: 'success',
  show: (message, variant) => set({ visible: true, message, variant }),
  hide: () => set({ visible: false }),
}));
