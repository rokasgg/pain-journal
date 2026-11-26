import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { VisitOverdueBanner } from '@/components/insights/VisitOverdueBanner';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { useExperiments } from '@/hooks/useExperiments';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { usePremium } from '@/hooks/usePremium';
import { paywallHref } from '@/hooks/usePremiumAction';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { overdueNextVisit } from '@/lib/physioVisits';
import { colors } from '@/lib/theme';
import { useToday } from '@/store/useTodayStore';

interface ToolTileProps {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Optional second line, e.g. "Day 3 of 14" while an experiment runs. */
  caption?: string;
  locked?: boolean;
}

// One compact tool tile: icon tile over a one-line label. The Pressable only
// takes a className (no style function: NativeWind's Pressable wrapper drops
// a style function's result when a className is also set). Tiles in the row
// stretch to the same height, so a caption on one doesn't misalign the rest.
function ToolTile({ href, icon, title, caption, locked = false }: ToolTileProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={caption ? `${title}. ${caption}` : title}
        className="flex-1 items-center gap-2 rounded-[18px] bg-surface px-2 py-3 active:opacity-70 dark:bg-surfaceDark"
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-accentMuted dark:bg-primaryMutedDark">
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View className="items-center">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            className="text-[14px] font-semibold text-ink dark:text-white"
          >
            {title}
          </Text>
          {caption && (
            <Text numberOfLines={1} className="text-[12px] text-inkSecondary dark:text-gray">
              {caption}
            </Text>
          )}
        </View>
        {locked && (
          <View className="absolute right-2 top-2">
            <PremiumBadge />
          </View>
        )}
      </Pressable>
    </Link>
  );
}

// The top of Insights: a pending "did your visit happen?" banner when there's
// something to answer, then the three tools as a compact row (Ask AI,
// Experiments, Visit prep). Always visible, ~110pt, so the findings below
// stay close to the top.
export function InsightsTools() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { running } = useExperiments();
  const { assessments } = usePhysioAssessments();
  const today = useToday();
  const { isPremium } = usePremium();
  const latestVisit = assessments[0];
  // Same condition as before: physio visits are Premium.
  const overdue = isPremium && latestVisit ? overdueNextVisit(latestVisit, today) : null;
  const aiOn = profile?.ai_insights_enabled ?? true;

  const experimentDay = running
    ? Math.min(differenceInCalendarDays(parseISO(today), parseISO(running.started_on)) + 1, running.length_days)
    : 0;

  return (
    <View className="gap-3">
      {latestVisit && overdue && <VisitOverdueBanner visit={latestVisit} overdueDate={overdue} />}

      <View className="flex-row gap-2.5">
        {aiOn && (
          <ToolTile
            href={isPremium ? ('/insights/chat' as Href) : paywallHref('ai')}
            locked={!isPremium}
            icon="chatbubble-ellipses-outline"
            title={t('insights.tools.ask')}
          />
        )}
        <ToolTile
          href={'/insights/experiments' as Href}
          icon="flask-outline"
          title={t('insights.tools.experiments')}
          caption={running ? t('experiments.dayOf', { day: experimentDay, total: running.length_days }) : undefined}
        />
        <ToolTile
          href={isPremium ? ('/insights/visit' as Href) : paywallHref('report')}
          locked={!isPremium}
          icon="document-text-outline"
          title={t('insights.tools.visitShort')}
        />
      </View>
    </View>
  );
}
