import * as ImagePicker from 'expo-image-picker';

import { t } from '@/lib/i18n/useTranslation';
import { toast } from '@/utils/toast';

export async function pickAvatarImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    toast.error(t('image.permissionRequired'));
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return null;

  return result.assets[0].uri;
}
