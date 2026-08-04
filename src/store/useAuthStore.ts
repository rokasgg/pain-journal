import { create } from 'zustand';

import { t } from '@/lib/i18n/useTranslation';
import { supabase } from '@/lib/supabase';

// session/user live in the React Query cache via useSession() — this store
// only wraps the write-side Supabase auth calls. It currently holds no state
// of its own; the auth results flow back through onAuthStateChange into the
// query cache rather than through a `set()` call here (see useSession.ts).
interface AuthActions {
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: { name?: string; avatarUrl?: string }) => Promise<{ error: string | null }>;
  uploadAvatar: (userId: string, localUri: string) => Promise<{ url: string | null; error: string | null }>;
}

export const useAuthStore = create<AuthActions>(() => ({
  signUp: async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  },

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },

  updateProfile: async ({ name, avatarUrl }) => {
    const data: Record<string, string> = {};
    if (name !== undefined) data.name = name;
    if (avatarUrl !== undefined) data.avatar_url = avatarUrl;

    const { error } = await supabase.auth.updateUser({ data });
    return { error: error?.message ?? null };
  },

  uploadAvatar: async (userId: string, localUri: string) => {
    try {
      const response = await fetch(localUri);
      const arrayBuffer = await response.arrayBuffer();
      const fileExt = localUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) return { url: null, error: uploadError.message };

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      return { url: `${data.publicUrl}?updated=${Date.now()}`, error: null };
    } catch {
      return { url: null, error: t('settings.failedUploadAvatar') };
    }
  },
}));
