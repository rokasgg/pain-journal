import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Switch, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { FEEDBACK_EMAIL } from '@/constants/app';
import { useJourney } from '@/hooks/useJourney';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { requestHealthAccess } from '@/lib/health/healthkit';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useHapticsStore } from '@/store/useHapticsStore';
import { useSoundStore } from '@/store/useSoundStore';
import { useHealthStore } from '@/store/useHealthStore';
import { useLocaleStore, type Locale } from '@/store/useLocaleStore';
import { haptics } from '@/utils/haptics';
import { sounds } from '@/utils/sounds';
import { toast } from '@/utils/toast';

const LANGUAGE_LABEL_KEYS: Record<Locale, string> = {
  en: 'languageSwitcher.english',
  lt: 'languageSwitcher.lithuanian',
};

// Layout from assets/possible-app-design/settings: profile card, then grouped
// Recovery / Preferences / Privacy & data / Account cards of icon-tile rows
// (SettingsSection + SettingsRow), then feedback + version.
export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useSession();
  const { profile } = useProfile();
  // Switch's on/off track colors are native props NativeWind can't style
  // (same sanctioned exception as the tab bar in (tabs)/_layout.tsx).
  const isDark = useColorScheme() === 'dark';
  const hapticsEnabled = useHapticsStore((s) => s.enabled);
  const setHapticsEnabled = useHapticsStore((s) => s.setEnabled);
  const soundsEnabled = useSoundStore((s) => s.enabled);
  const setSoundsEnabled = useSoundStore((s) => s.setEnabled);
  const healthEnabled = useHealthStore((s) => s.enabled);
  const setHealthEnabled = useHealthStore((s) => s.setEnabled);
  const locale = useLocaleStore((s) => s.locale);
  const updateProfileMutation = useUpdateProfile();
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const signOut = useAuthStore((state) => state.signOut);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const [isSignOutModalVisible, setIsSignOutModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const aiInsightsEnabled = profile?.ai_insights_enabled ?? true;
  // Explicit choice always wins over the journey's derived default
  // (lib/journey.ts resolveTrainingEnabled).
  const { trainingEnabled } = useJourney();

  const name = (user?.user_metadata?.name as string | undefined) ?? t('common.anonymous');
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const email = user?.email ?? '';
  const version = Constants.expoConfig?.version ?? '';

  const switchColors = {
    trackColor: { false: colors.gray, true: isDark ? colors.primaryDark : colors.primary },
    thumbColor: colors.white,
    ios_backgroundColor: colors.gray,
  };

  const handleToggleTraining = async (value: boolean) => {
    haptics.tick();
    const { error } = await updateProfileMutation.mutateAsync({ training_enabled: value });
    if (error) toast.error(error);
  };

  const handleToggleAiInsights = async (value: boolean) => {
    haptics.tick();
    const { error } = await updateProfileMutation.mutateAsync({ ai_insights_enabled: value });
    if (error) toast.error(error);
  };

  // Turning it on shows Apple's permission sheet. Off just stops reading; the
  // permission itself can only be revoked in the Health app.
  const handleToggleHealth = async (value: boolean) => {
    haptics.tick();
    if (!value) {
      setHealthEnabled(false);
      return;
    }
    if (!(await requestHealthAccess())) {
      toast.error(t('settings.appleHealthUnavailable'));
      return;
    }
    setHealthEnabled(true);
  };

  const handleChangePassword = async () => {
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

  // Permanent, App Store–required in-app deletion. The SIGNED_OUT that
  // follows a successful delete sends the root layout back to login.
  // The sheet stays open with a spinner while the server deletes everything
  // (it can take a few seconds), then closes before any toast: the toast is an
  // in-tree overlay and would sit under the sheet's native Modal.
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const { error } = await deleteAccount();
    setIsDeleting(false);
    setIsDeleteModalVisible(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(t('settings.accountDeleted'));
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-7 px-5 pb-12 pt-8">
        <Text className="px-1 text-4xl font-bold text-black dark:text-white">{t('tabs.settings')}</Text>

        <Pressable
          onPress={() => router.push('/settings/edit-profile' as Href)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.editProfile')}
          className="flex-row items-center gap-4 rounded-3xl bg-surface p-4 active:opacity-70 dark:bg-surfaceDark"
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} contentFit="cover" className="h-14 w-14 rounded-full" />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary dark:bg-primaryDark">
              <Text className="text-2xl font-bold text-white">{name.trim().charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View className="flex-1 gap-0.5">
            <Text className="text-xl font-bold text-black dark:text-white" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-base text-gray" numberOfLines={1}>
              {email}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.gray} />
        </Pressable>

        <SettingsSection title={t('settings.sectionRecovery')}>
          <SettingsRow
            icon="bandage-outline"
            title={t('settings.injuryInfo')}
            onPress={() => router.push('/settings/injury-info' as Href)}
          />
          <SettingsRow
            icon="person-outline"
            title={t('settings.aboutMe')}
            subtitle={t('settings.aboutMeInfo')}
            onPress={() => router.push('/settings/about-me' as Href)}
          />
          <SettingsRow
            icon="barbell-outline"
            title={t('journey.trainingSetting')}
            subtitle={t('journey.trainingSettingInfo')}
            accessory={<Switch value={trainingEnabled} onValueChange={handleToggleTraining} {...switchColors} />}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sectionPreferences')}>
          <SettingsRow
            icon="notifications-outline"
            title={t('screenTitles.notifications')}
            onPress={() => router.push('/settings/notifications' as Href)}
          />
          <SettingsRow
            icon="globe-outline"
            title={t('settings.language')}
            value={t(LANGUAGE_LABEL_KEYS[locale])}
            onPress={() => router.push('/settings/language' as Href)}
          />
          <SettingsRow icon="contrast-outline" title={t('settings.appearance')} below={<ThemeSwitcher />} />
          <SettingsRow
            icon="phone-portrait-outline"
            title={t('settings.vibration')}
            subtitle={t('settings.vibrationInfo')}
            accessory={
              <Switch
                value={hapticsEnabled}
                onValueChange={(value) => {
                  setHapticsEnabled(value);
                  // After enabling, so turning it on is itself felt.
                  haptics.tick();
                }}
                {...switchColors}
              />
            }
          />
          <SettingsRow
            icon="musical-note-outline"
            title={t('settings.sounds')}
            subtitle={t('settings.soundsInfo')}
            accessory={
              <Switch
                value={soundsEnabled}
                onValueChange={(value) => {
                  setSoundsEnabled(value);
                  haptics.tick();
                  // Turning it on plays the chime, so the user hears what it is.
                  if (value) sounds.celebrate();
                }}
                {...switchColors}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.sectionPrivacy')}>
          {Platform.OS === 'ios' && (
            <SettingsRow
              icon="heart-outline"
              title={t('settings.appleHealth')}
              subtitle={t('settings.appleHealthInfo')}
              accessory={<Switch value={healthEnabled} onValueChange={handleToggleHealth} {...switchColors} />}
            />
          )}
          <SettingsRow
            icon="sparkles-outline"
            title={t('settings.aiInsights')}
            // Says where health data goes when AI features are on.
            subtitle={t('settings.aiInsightsInfo')}
            accessory={<Switch value={aiInsightsEnabled} onValueChange={handleToggleAiInsights} {...switchColors} />}
          />
          <SettingsRow
            icon="document-text-outline"
            title={t('settings.privacyPolicy')}
            onPress={() => toast.info(t('settings.privacyPolicyComingSoon'))}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.account')}>
          <SettingsRow icon="lock-closed-outline" title={t('settings.changePassword')} onPress={handleChangePassword} />
          <SettingsRow
            icon="log-out-outline"
            title={t('settings.signOut')}
            onPress={() => setIsSignOutModalVisible(true)}
            showChevron={false}
          />
          <SettingsRow
            icon="trash-outline"
            title={t('settings.deleteAccount')}
            tone="destructive"
            onPress={() => setIsDeleteModalVisible(true)}
            showChevron={false}
          />
        </SettingsSection>

        <View className="items-center gap-1.5">
          {FEEDBACK_EMAIL !== '' && (
            <Pressable onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}`)} hitSlop={8}>
              <Text className="text-base font-semibold text-primary underline dark:text-primaryDark">
                {t('settings.sendFeedback')}
              </Text>
            </Pressable>
          )}
          {version !== '' && <Text className="text-sm text-gray">{t('settings.version', { version })}</Text>}
        </View>
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

      <ConfirmModal
        visible={isDeleteModalVisible}
        title={t('settings.deleteAccountConfirmTitle')}
        message={t('settings.deleteAccountConfirmMessage')}
        confirmLabel={t('settings.deleteAccountConfirm')}
        confirmPhrase="DELETE"
        isLoading={isDeleting}
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
      />
    </SafeAreaView>
  );
}
