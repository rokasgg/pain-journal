import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useJourney } from '@/hooks/useJourney';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/hooks/useSession';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { hasUnansweredAboutMe } from '@/lib/startingPicture';
import { colors } from '@/lib/theme';
import { useJourneyStore } from '@/store/useJourneyStore';

// After this many logged days the app has earned a minute of the user's time.
const SHOW_AFTER_LOGGED_DAYS = 3;

// One-time Home card for the onboarding questions that were skipped with
// "Ask me later" (work, stress, hunches). Opens Settings → About me; closing
// or opening it hides it for good on this device (per account).
export function AboutMeCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const { state, isLoading: journeyLoading } = useJourney();
  const doneBy = useJourneyStore((s) => s.aboutMeNudgeDoneBy);
  const markDone = useJourneyStore((s) => s.markAboutMeNudgeDone);

  if (!user || !profile || profileLoading || journeyLoading) return null;
  if (doneBy.includes(user.id) || state.loggedDays < SHOW_AFTER_LOGGED_DAYS) return null;
  if (!hasUnansweredAboutMe(profile)) return null;

  return (
    <View className="gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
          <Ionicons name="person-outline" size={20} color={colors.accent} />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-black dark:text-white">{t('aboutMe.cardTitle')}</Text>
          <Text className="text-sm text-inkSecondary dark:text-gray">{t('aboutMe.cardBody')}</Text>
        </View>
        <Pressable
          onPress={() => markDone(user.id)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <Ionicons name="close" size={20} color={colors.gray} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          markDone(user.id);
          router.push('/settings/about-me' as Href);
        }}
        className="items-center self-start rounded-lg bg-primary px-4 py-2 active:opacity-90 dark:bg-primaryDark"
      >
        <Text className="font-semibold text-white">{t('aboutMe.cardCta')}</Text>
      </Pressable>
    </View>
  );
}
