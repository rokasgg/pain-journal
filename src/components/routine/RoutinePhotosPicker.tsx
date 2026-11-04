import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { MAX_ROUTINE_PHOTOS, pickExercisePhotos, type RoutinePhoto } from '@/utils/image';

export interface RoutinePhotosPickerProps {
  photos: RoutinePhoto[];
  onChange: (photos: RoutinePhoto[]) => void;
}

// routine/new.tsx → "Photos": the physio's exercise sheet or handwritten
// notes, up to MAX_ROUTINE_PHOTOS, taken with the camera or picked from the
// gallery. They only live in the screen's state and go to generate-routine
// once; nothing is stored.
export function RoutinePhotosPicker({ photos, onChange }: RoutinePhotosPickerProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<'camera' | 'library' | null>(null);
  const remaining = MAX_ROUTINE_PHOTOS - photos.length;

  const add = async (from: 'camera' | 'library') => {
    if (picking) return;
    setPicking(from);
    const picked = await pickExercisePhotos(from, remaining);
    setPicking(null);
    if (picked.length === 0) return;
    haptics.tick();
    onChange([...photos, ...picked].slice(0, MAX_ROUTINE_PHOTOS));
  };

  const remove = (uri: string) => {
    haptics.tick();
    onChange(photos.filter((photo) => photo.uri !== uri));
  };

  return (
    <View className="gap-3">
      <Text className="text-sm text-inkSecondary dark:text-gray">{t('routine.photosHint')}</Text>

      {photos.length > 0 && (
        // Placeholder rows rather than thumbnails: a tiny crop of a sheet of
        // paper is unreadable anyway, and the review step shows what was read.
        <View className="rounded-2xl bg-surface dark:bg-surfaceDark">
          {photos.map((photo, index) => (
            <View
              key={photo.uri}
              className={`flex-row items-center gap-3 px-3 py-2.5 ${index > 0 ? 'border-t border-borderLight dark:border-borderDark' : ''}`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
                <Ionicons name="image-outline" size={20} color={colors.accent} />
              </View>
              <Text className="flex-1 text-body text-ink dark:text-white">
                {t('routine.photoLabel', { number: index + 1 })}
              </Text>
              <Pressable
                onPress={() => remove(photo.uri)}
                accessibilityRole="button"
                accessibilityLabel={`${t('routine.removePhoto')}, ${t('routine.photoLabel', { number: index + 1 })}`}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-segmentTrack active:opacity-70 dark:bg-segmentTrackDark"
              >
                <Ionicons name="close" size={18} color={colors.gray} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text className="text-caption text-inkSecondary dark:text-gray">
        {t('routine.photosCount', { count: photos.length, max: MAX_ROUTINE_PHOTOS })}
      </Text>

      {remaining > 0 && (
        <View className="flex-row gap-2">
          {(['camera', 'library'] as const).map((from) => (
            <Pressable
              key={from}
              onPress={() => add(from)}
              disabled={picking !== null}
              accessibilityRole="button"
              className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-primary py-3 active:opacity-70 dark:border-primaryDark"
            >
              {picking === from ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Ionicons name={from === 'camera' ? 'camera-outline' : 'images-outline'} size={18} color={colors.primary} />
                  <Text className="text-sm font-semibold text-primary dark:text-white">
                    {t(from === 'camera' ? 'routine.takePhoto' : 'routine.choosePhotos')}
                  </Text>
                </>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
