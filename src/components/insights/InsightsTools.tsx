import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useExperiments } from '@/hooks/useExperiments';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { overdueNextVisit } from '@/lib/physioVisits';
import { colors } from '@/lib/theme';
import { useToday } from '@/store/useTodayStore';

const OVERDUE_DOT = '#B42318';

function Tile({
  href,
  icon,
  title,
  subtitle,
  dot = false,
}: {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  dot?: boolean;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        className="flex-1 gap-2 rounded-[18px] bg-surface p-3.5 active:opacity-80 dark:bg-surfaceDark"
      >
        <View className="flex-row items-start justify-between">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
            <Ionicons name={icon} size={18} color={colors.accent} />
          </View>
          {dot && <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OVERDUE_DOT }} />}
        </View>
        <Text className="text-[15px] font-semibold leading-5 text-ink dark:text-white">{title}</Text>
        <Text className="text-[12px] leading-4 text-inkSecondary dark:text-gray">{subtitle}</Text>
      </Pressable>
    </Link>
  );
}

// Insights' three tools, one tap away instead of stacked on the page: Ask AI
// (hidden when AI insights are off), Experiments (shows the running day), and
// Prepare for visit (a dot when "did your visit happen?" is waiting).
export function InsightsTools() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { running } = useExperiments();
  const { assessments } = usePhysioAssessments();
  const today = useToday();
  const overdue = overdueNextVisit(assessments[0], today) !== null;
  const aiOn = profile?.ai_insights_enabled ?? true;

  const experimentDay = running
    ? Math.min(differenceInCalendarDays(parseISO(today), parseISO(running.started_on)) + 1, running.length_days)
    : 0;

  return (
    <View className="flex-row gap-3">
      {aiOn && (
        <Tile
          href={'/insights/chat' as Href}
          icon="chatbubble-ellipses-outline"
          title={t('insights.tools.ask')}
          subtitle={t('insights.tools.askSub')}
        />
      )}
      <Tile
        href={'/insights/experiments' as Href}
        icon="flask-outline"
        title={t('insights.tools.experiments')}
        subtitle={
          running
            ? t('experiments.dayOf', { day: experimentDay, total: running.length_days })
            : t('insights.tools.experimentsSub')
        }
      />
      <Tile
        href={'/insights/visit' as Href}
        icon="document-text-outline"
        title={t('insights.tools.visit')}
        subtitle={overdue ? t('insights.tools.visitOverdue') : t('insights.tools.visitSub')}
        dot={overdue}
      />
    </View>
  );
}
