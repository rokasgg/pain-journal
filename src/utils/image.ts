import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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

// Routine from photos (routine/new.tsx): exercise sheets / handwritten notes
// sent once to generate-routine and never stored.
export const MAX_ROUTINE_PHOTOS = 4;
// Long edge after resizing: sharp enough to read a printed or handwritten
// sheet, small enough (≈200–400 KB) that 4 photos don't blow up the request
// or the AI cost. Claude downscales anything bigger anyway.
const ROUTINE_PHOTO_MAX_EDGE = 1600;

export interface RoutinePhoto {
  uri: string;
  base64: string;
}

async function shrinkPhoto(asset: ImagePicker.ImagePickerAsset): Promise<RoutinePhoto | null> {
  const landscape = asset.width >= asset.height;
  const longEdge = Math.max(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  if (longEdge > ROUTINE_PHOTO_MAX_EDGE) {
    context.resize(landscape ? { width: ROUTINE_PHOTO_MAX_EDGE } : { height: ROUTINE_PHOTO_MAX_EDGE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  return result.base64 ? { uri: result.uri, base64: result.base64 } : null;
}

// Takes one photo with the camera, or picks up to `remaining` from the
// library, and returns them resized. [] when cancelled or not allowed.
export async function pickExercisePhotos(from: 'camera' | 'library', remaining: number): Promise<RoutinePhoto[]> {
  if (remaining <= 0) return [];
  const permission =
    from === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    toast.error(t(from === 'camera' ? 'image.cameraPermissionRequired' : 'image.permissionRequired'));
    return [];
  }

  const result =
    from === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          selectionLimit: remaining,
          quality: 1,
        });
  if (result.canceled) return [];

  try {
    const photos = await Promise.all(result.assets.slice(0, remaining).map(shrinkPhoto));
    return photos.filter((photo): photo is RoutinePhoto => photo !== null);
  } catch {
    toast.error(t('image.processFailed'));
    return [];
  }
}
