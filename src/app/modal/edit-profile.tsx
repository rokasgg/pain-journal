import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { Input } from '@/components/ui/Input';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/lib/theme';
import { editProfileSchema, type EditProfileFormData } from '@/lib/validations/profile';
import { useAuthStore } from '@/store/useAuthStore';
import { pickAvatarImage } from '@/utils/image';
import { toast } from '@/utils/toast';

export default function EditProfileModal() {
  const router = useRouter();
  const { user } = useSession();
  const uploadAvatar = useAuthStore((state) => state.uploadAvatar);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentName = (user?.user_metadata?.name as string | undefined) ?? '';
  const currentAvatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { name: currentName, avatarUri: null },
  });

  const avatarUri = watch('avatarUri');
  const displayedAvatar = avatarUri ?? currentAvatarUrl;

  const handlePickAvatar = async () => {
    const uri = await pickAvatarImage();
    if (uri) setValue('avatarUri', uri);
  };

  const onSubmit = async (data: EditProfileFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    let avatarUrl: string | undefined;

    if (data.avatarUri) {
      const { url, error: uploadError } = await uploadAvatar(user.id, data.avatarUri);

      if (uploadError || !url) {
        setIsSubmitting(false);
        toast.error(uploadError ?? 'Failed to upload avatar.');
        return;
      }

      avatarUrl = url;
    }

    const { error } = await updateProfile({ name: data.name, avatarUrl });
    setIsSubmitting(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Profile updated!');
    router.back();
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-backgroundDark"
      contentContainerClassName="gap-6 px-6 py-6"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View className="items-center gap-3">
        <Pressable onPress={handlePickAvatar} accessibilityRole="button" accessibilityLabel="Change avatar">
          {displayedAvatar ? (
            <Image
              source={{ uri: displayedAvatar }}
              className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-800"
              contentFit="cover"
            />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
              <Ionicons name="person" size={40} color={colors.gray} />
            </View>
          )}
        </Pressable>

        <Pressable onPress={handlePickAvatar}>
          <Text className="text-sm font-medium text-black dark:text-white">Change Photo</Text>
        </Pressable>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Display Name"
            placeholder="Jane Doe"
            onChangeText={onChange}
            onBlur={onBlur}
            value={value}
            error={errors.name?.message}
          />
        )}
      />

      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 items-center rounded-lg border border-gray-300 py-3 dark:border-gray-700"
        >
          <Text className="font-semibold text-black dark:text-white">Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex-1 items-center rounded-lg bg-primary py-3 disabled:opacity-50 dark:bg-primaryDark"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="font-semibold text-white">Save</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
