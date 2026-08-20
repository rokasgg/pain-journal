import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { useSession } from '@/hooks/useSession';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { pickAvatarImage } from '@/utils/image';
import { toast } from '@/utils/toast';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useSession();
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const signOut = useAuthStore((state) => state.signOut);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);

  const name = (user?.user_metadata?.name as string | undefined) ?? t('common.anonymous');
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const email = user?.email ?? '';

  const handleEditAvatar = async () => {
    if (!user) return;

    const uri = await pickAvatarImage();
    if (!uri) return;

    setIsUploadingAvatar(true);
    const { url, error: uploadError } = await uploadAvatar(user.id, uri);

    if (uploadError || !url) {
      setIsUploadingAvatar(false);
      toast.error(uploadError ?? t('settings.failedUploadAvatar'));
      return;
    }

    const { error: updateError } = await updateProfile({ avatarUrl: url });
    setIsUploadingAvatar(false);

    if (updateError) {
      toast.error(updateError);
      return;
    }

    toast.success(t('settings.avatarUpdated'));
  };

  const handleResetPassword = async () => {
    if (!email) return;
    const { error } = await resetPassword(email);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('auth.passwordResetEmailSent'));
  };

  const handleConfirmSignOut = async () => {
    setIsSignOutModalVisible(false);
    const { error } = await signOut();

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(t('settings.signedOut'));
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 py-8"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="items-center gap-3">
          <View className="relative">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-24 w-24 rounded-full bg-gray dark:bg-gray"
                contentFit="cover"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                <Ionicons name="person" size={40} color={colors.gray} />
              </View>
            )}

            <Pressable
              onPress={handleEditAvatar}
              disabled={isUploadingAvatar}
              accessibilityRole="button"
              accessibilityLabel={t('settings.changeAvatar')}
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-primary dark:bg-primaryDark"
            >
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons name="pencil" size={16} color={colors.white} />
              )}
            </Pressable>
          </View>

          <View className="items-center gap-0.5">
            <Text className="text-xl font-bold text-black dark:text-white">{name}</Text>
            <Text className="text-sm text-gray-500 dark:text-gray">{email}</Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-strongGray dark:text-white">
            {t('settings.account')}
          </Text>

          <View className="overflow-hidden rounded-lg border border-gray dark:border-gray bg-surface dark:bg-surfaceDark">
            <Pressable
              onPress={() => router.push('/modal/edit-profile')}
              className="flex-row items-center justify-between border-b border-gray px-4 py-3.5 dark:border-gray"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="person-outline" size={20} color={colors.gray} />
                <Text className="text-base text-strongGray dark:text-white">{t('settings.editProfile')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>

            <Pressable
              onPress={handleResetPassword}
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="lock-closed-outline" size={20} color={colors.gray} />
                <Text className="text-base text-strongGray dark:text-white">{t('settings.resetPassword')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-strongGray dark:text-white">
            {t('settings.healthInfo')}
          </Text>

          <View className="overflow-hidden rounded-lg border border-gray dark:border-gray bg-surface dark:bg-surfaceDark">
            <Pressable
              onPress={() => router.push('/modal/injury-info' as Href)}
              className="flex-row items-center justify-between border-b border-gray px-4 py-3.5 dark:border-gray"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="bandage-outline" size={20} color={colors.gray} />
                <Text className="text-base text-strongGray dark:text-white">{t('settings.injuryInfo')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/modal/notifications' as Href)}
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="notifications-outline" size={20} color={colors.gray} />
                <Text className="text-base text-strongGray dark:text-white">{t('screenTitles.notifications')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-strongGray dark:text-white">
            {t('settings.legal')}
          </Text>

          <View className="overflow-hidden rounded-lg border border-gray dark:border-gray bg-surface dark:bg-surfaceDark">
            <Pressable
              onPress={() => toast.info(t('settings.privacyPolicyComingSoon'))}
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="document-text-outline" size={20} color={colors.gray} />
                <Text className="text-base text-strongGray dark:text-white">{t('settings.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-strongGray dark:text-white">
            {t('settings.appearance')}
          </Text>
          <ThemeSwitcher />
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-strongGray dark:text-white">
            {t('settings.language')}
          </Text>
          <LanguageSwitcher />
        </View>

        <Pressable
          onPress={() => setIsSignOutModalVisible(true)}
          className="items-center rounded-lg border border-red-600 py-3 dark:border-red-500"
        >
          <Text className="font-semibold text-red-600 dark:text-red-500">{t('settings.signOut')}</Text>
        </Pressable>
      </ScrollView>

      <ConfirmModal
        visible={isSignOutModalVisible}
        title={t('settings.signOutConfirmTitle')}
        message={t('settings.signOutConfirmMessage')}
        confirmLabel={t('settings.signOut')}
        variant="destructive"
        onConfirm={handleConfirmSignOut}
        onCancel={() => setIsSignOutModalVisible(false)}
      />
    </SafeAreaView>
  );
}
