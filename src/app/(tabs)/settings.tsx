import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DatePickerField } from '@/components/ui/DatePickerField';
import { Input } from '@/components/ui/Input';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useReminderSettings, useUpdateReminderSettings } from '@/hooks/useReminderSettings';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';
import type { Profile, ReminderSettings } from '@/types/database.types';
import { pickAvatarImage } from '@/utils/image';
import { toast } from '@/utils/toast';

interface InjuryInfoSectionProps {
  profile: Profile | null;
}

// Keyed by `profile?.id` from the parent so this remounts (with fresh
// defaultValues) the moment the profile query resolves, instead of trying to
// sync local state into an already-mounted form — that "sync on render"
// approach proved unreliable here (see settings.tsx history).
function InjuryInfoSection({ profile }: InjuryInfoSectionProps) {
  const updateProfileMutation = useUpdateProfile();
  const [injuryStartedOn, setInjuryStartedOn] = useState<string | null>(
    profile?.injury_started_on ?? null,
  );
  const [injuryDescription, setInjuryDescription] = useState(profile?.injury_description ?? '');

  const handleSave = async () => {
    const { error } = await updateProfileMutation.mutateAsync({
      injury_started_on: injuryStartedOn || null,
      injury_description: injuryDescription || null,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Injury info updated!');
  };

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
        Injury Info
      </Text>

      <DatePickerField
        label="Injury start date"
        value={injuryStartedOn}
        onChange={setInjuryStartedOn}
        maximumDate={new Date()}
      />
      <Input
        label="Description"
        placeholder="What happened?"
        multiline
        numberOfLines={3}
        value={injuryDescription}
        onChangeText={setInjuryDescription}
      />

      <Pressable
        onPress={handleSave}
        disabled={updateProfileMutation.isPending}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {updateProfileMutation.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">Save Injury Info</Text>
        )}
      </Pressable>
    </View>
  );
}

interface ReminderSettingsSectionProps {
  settings: ReminderSettings | null;
}

function ReminderSettingsSection({ settings }: ReminderSettingsSectionProps) {
  const updateReminderSettingsMutation = useUpdateReminderSettings();
  const [morningTime, setMorningTime] = useState(settings?.morning_time ?? '08:00');
  const [eveningTime, setEveningTime] = useState(settings?.evening_time ?? '21:00');
  const [pushEnabled, setPushEnabled] = useState(settings?.push_enabled ?? true);

  const handleSave = async () => {
    const { error } = await updateReminderSettingsMutation.mutateAsync({
      morning_time: morningTime,
      evening_time: eveningTime,
      push_enabled: pushEnabled,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Reminder settings updated!');
  };

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
        Reminders
      </Text>

      <View className="flex-row items-center justify-between rounded-2xl bg-primaryMuted px-4 py-3 dark:bg-primaryMutedDark">
        <Text className="text-base text-black dark:text-white">Push notifications</Text>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Input label="Morning reminder" placeholder="08:00" value={morningTime} onChangeText={setMorningTime} />
      <Input label="Evening reminder" placeholder="21:00" value={eveningTime} onChangeText={setEveningTime} />

      <Pressable
        onPress={handleSave}
        disabled={updateReminderSettingsMutation.isPending}
        className="items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
      >
        {updateReminderSettingsMutation.isPending ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text className="font-semibold text-white">Save Reminders</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const signOut = useAuthStore((state) => state.signOut);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { profile, isLoading: isProfileLoading } = useProfile();
  const { settings, isLoading: isSettingsLoading } = useReminderSettings();

  const name = (user?.user_metadata?.name as string | undefined) ?? 'Anonymous';
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
      toast.error(uploadError ?? 'Failed to upload avatar.');
      return;
    }

    const { error: updateError } = await updateProfile({ avatarUrl: url });
    setIsUploadingAvatar(false);

    if (updateError) {
      toast.error(updateError);
      return;
    }

    toast.success('Avatar updated!');
  };

  const handleResetPassword = async () => {
    if (!email) return;
    const { error } = await resetPassword(email);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Password reset email sent!');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await signOut();

          if (error) {
            toast.error(error);
            return;
          }

          toast.success('Signed out.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-backgroundDark" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 py-8">
        <View className="items-center gap-3">
          <View className="relative">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-800"
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
              accessibilityLabel="Change avatar"
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
            <Text className="text-sm text-gray-500 dark:text-gray-400">{email}</Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            Appearance
          </Text>
          <ThemeSwitcher />
        </View>

        <View className="gap-3">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            Account
          </Text>

          <View className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <Pressable
              onPress={() => router.push('/modal/edit-profile')}
              className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3.5 dark:border-gray-800"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="person-outline" size={20} color={colors.gray} />
                <Text className="text-base text-black dark:text-white">Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>

            <Pressable
              onPress={handleResetPassword}
              className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3.5 dark:border-gray-800"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="lock-closed-outline" size={20} color={colors.gray} />
                <Text className="text-base text-black dark:text-white">Reset Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>

            <Pressable
              onPress={() => toast.info('Privacy policy coming soon.')}
              className="flex-row items-center justify-between px-4 py-3.5"
            >
              <View className="flex-row items-center gap-3">
                <Ionicons name="document-text-outline" size={20} color={colors.gray} />
                <Text className="text-base text-black dark:text-white">Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </Pressable>
          </View>
        </View>

        {isProfileLoading ? (
          <ActivityIndicator />
        ) : (
          <InjuryInfoSection key={profile?.id ?? 'none'} profile={profile} />
        )}

        {isSettingsLoading ? (
          <ActivityIndicator />
        ) : (
          <ReminderSettingsSection key={settings ? 'loaded' : 'none'} settings={settings} />
        )}

        <Pressable
          onPress={handleSignOut}
          className="items-center rounded-lg border border-red-600 py-3 dark:border-red-500"
        >
          <Text className="font-semibold text-red-600 dark:text-red-500">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
