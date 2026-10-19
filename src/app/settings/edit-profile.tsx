import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { SettingsFieldRow } from '@/components/settings/SettingsFieldRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useSession } from '@/hooks/useSession';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { editProfileSchema, type EditProfileFormData } from '@/lib/validations/profile';
import { headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import { useAuthStore } from '@/store/useAuthStore';
import { pickAvatarImage } from '@/utils/image';
import { toast } from '@/utils/toast';

const AVATAR_SIZE = 104;

// Settings → Edit profile (design from assets/possible-app-design/setting).
// A pushed page like the other settings sub-pages: native "‹ Settings" back,
// Save in the header. Leaving with unsaved edits (back button or swipe)
// asks first, since there's no explicit Cancel any more.
export default function EditProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useSession();
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscardVisible, setIsDiscardVisible] = useState(false);
  // Set right before the post-save router.back(), so the guard lets it through.
  const skipGuardRef = useRef(false);
  const isDirtyRef = useRef(false);
  const pendingLeaveRef = useRef<(() => void) | null>(null);

  const currentName = (user?.user_metadata?.name as string | undefined) ?? '';
  const currentAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const email = user?.email ?? '';

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { name: currentName, avatarUri: null },
  });

  const avatarUri = watch('avatarUri');
  const name = watch('name');
  const displayedAvatar = avatarUri ?? currentAvatarUrl;
  const initial = (name.trim() || currentName.trim()).charAt(0).toUpperCase();

  const handlePickAvatar = async () => {
    const uri = await pickAvatarImage();
    if (uri) setValue('avatarUri', uri, { shouldDirty: true });
  };

  const onSubmit = async (data: EditProfileFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    let avatarUrl: string | undefined;
    if (data.avatarUri) {
      const { url, error: uploadError } = await uploadAvatar(user.id, data.avatarUri);
      if (uploadError || !url) {
        setIsSubmitting(false);
        toast.error(uploadError ?? t('settings.failedUploadAvatar'));
        return;
      }
      avatarUrl = url;
    }

    const { error } = await updateProfile({ name: data.name.trim(), avatarUrl });
    setIsSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }

    // Toast before back (CLAUDE.md: toast-then-navigate ordering).
    toast.success(t('editProfile.profileUpdated'));
    skipGuardRef.current = true;
    router.back();
  };

  const canSave = isDirty && !isSubmitting;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (skipGuardRef.current || !isDirtyRef.current) return;
      e.preventDefault();
      pendingLeaveRef.current = () => navigation.dispatch(e.data.action);
      setIsDiscardVisible(true);
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <>
      <Stack.Screen
        options={headerRightWithoutGlass(
          isSubmitting ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={!canSave}
              hitSlop={10}
              accessibilityRole="button"
              // Disabled look via style, not a toggled class (NativeWind
              // upgrade gotcha, CLAUDE.md).
              style={{ opacity: canSave ? 1 : 0.4 }}
            >
              <Text className="text-base font-bold text-primary dark:text-white">{t('common.save')}</Text>
            </Pressable>
          ),
        )}
      />

      <ScrollView
        className="flex-1 bg-background dark:bg-backgroundDark"
        contentContainerClassName="gap-8 px-5 pb-12 pt-6"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
      >
        <View className="items-center gap-4">
          <Pressable
            onPress={handlePickAvatar}
            accessibilityRole="button"
            accessibilityLabel={t('settings.changeAvatar')}
            style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
          >
            {displayedAvatar ? (
              <Image source={{ uri: displayedAvatar }} contentFit="cover" className="h-full w-full rounded-full" />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-full bg-primary dark:bg-primaryDark">
                <Text className="text-5xl font-bold text-white">{initial}</Text>
              </View>
            )}
            <View className="absolute -bottom-0.5 -right-0.5 h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-white dark:border-backgroundDark dark:bg-surfaceDark">
              <Ionicons name="camera-outline" size={18} color={colors.primary} />
            </View>
          </Pressable>

          <Pressable onPress={handlePickAvatar} hitSlop={8} accessibilityRole="button">
            <Text className="text-base font-bold text-primary dark:text-primaryDark">{t('editProfile.changePhoto')}</Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <SettingsSection footer={errors.name?.message ? undefined : t('editProfile.emailHint')}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <SettingsFieldRow
                  label={t('editProfile.nameLabel')}
                  placeholder={t('auth.namePlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                  returnKeyType="done"
                  clearAccessibilityLabel={t('editProfile.clearName')}
                />
              )}
            />
            <SettingsFieldRow label={t('editProfile.emailLabel')} value={email} readOnly />
          </SettingsSection>
          {errors.name?.message && (
            <Text className="px-1 text-sm text-red-600 dark:text-red-500">{t(errors.name.message)}</Text>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={isDiscardVisible}
        title={t('editProfile.discardTitle')}
        message={t('editProfile.discardMessage')}
        confirmLabel={t('editProfile.discardConfirm')}
        variant="destructive"
        onConfirm={() => {
          setIsDiscardVisible(false);
          skipGuardRef.current = true;
          pendingLeaveRef.current?.();
        }}
        onCancel={() => setIsDiscardVisible(false)}
      />
    </>
  );
}
