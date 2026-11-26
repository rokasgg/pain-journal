import { Ionicons } from '@expo/vector-icons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Link, type Href } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { useExperiments } from '@/hooks/useExperiments';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { usePremium } from '@/hooks/usePremium';
import { paywallHref } from '@/hooks/usePremiumAction';
import { useProfile } from '@/hooks/useProfile';
import { pluralCategory } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { overdueNextVisit } from '@/lib/physioVisits';
import { colors } from '@/lib/theme';
import { useToday } from '@/store/useTodayStore';

const OVERDUE_RED = '#B42318';
const CHEVRON_COLOR = '#9AA19C';

interface ToolRowProps {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  /** Pending actions (e.g. "did your visit happen?"); a red pill when > 0. */
  todo?: number;
  locked?: boolean;
}

// One tool in the grouped Tools card. The Pressable only handles the press
// and its pressed background (style function, no className): NativeWind's
// Pressable wrapper dropped a style function's result when a className was
// also set, which lost all the row's padding and spacing. Layout lives in
// `styles` on plain Views; colours stay as theme classes so dark mode works.
function ToolRow({ href, icon, title, subtitle, todo = 0, locked = false }: ToolRowProps) {
  const { t, locale } = useTranslation();
  const dark = useColorScheme() === 'dark';
  const todoLabel = todo > 0 ? t(`insights.tools.toDo.${pluralCategory(todo, locale)}`, { count: todo }) : null;
  const pressedColor = dark ? colors.segmentTrackDark : colors.segmentTrack;

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, subtitle, todoLabel].filter(Boolean).join('. ')}
        style={({ pressed }) => [{ backgroundColor: pressed ? pressedColor : 'transparent' }]}
      >
        <View style={styles.row}>
          <View style={styles.tile} className="bg-accentMuted dark:bg-primaryMutedDark">
            <Ionicons name={icon} size={22} color={colors.accent} />
          </View>
          <View style={styles.text}>
            <Text numberOfLines={1} style={styles.title} className="text-ink dark:text-white">
              {title}
            </Text>
            <Text numberOfLines={2} style={styles.subtitle} className="text-inkSecondary dark:text-gray">
              {subtitle}
            </Text>
          </View>
          {todoLabel && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{todoLabel}</Text>
            </View>
          )}
          {locked && (
            <View style={styles.lock}>
              <PremiumBadge />
            </View>
          )}
          <View style={todoLabel ? undefined : styles.chevron}>
            <Ionicons name="chevron-forward" size={20} color={CHEVRON_COLOR} />
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

// Insights' tools as one grouped list card: Prepare for visit (a "1 to do"
// pill when "did your visit happen?" is waiting), Ask AI (hidden when AI
// insights are off) and Experiments (shows the running day).
export function InsightsTools() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { running } = useExperiments();
  const { assessments } = usePhysioAssessments();
  const today = useToday();
  const { isPremium } = usePremium();
  const overdue = isPremium && overdueNextVisit(assessments[0], today) !== null;
  const aiOn = profile?.ai_insights_enabled ?? true;

  const experimentDay = running
    ? Math.min(differenceInCalendarDays(parseISO(today), parseISO(running.started_on)) + 1, running.length_days)
    : 0;

  const rows: (ToolRowProps & { key: string })[] = [
    {
      key: 'visit',
      href: isPremium ? ('/insights/visit' as Href) : paywallHref('report'),
      locked: !isPremium,
      icon: 'document-text-outline',
      title: t('insights.tools.visit'),
      subtitle: overdue ? t('insights.tools.visitOverdue') : t('insights.tools.visitSub'),
      todo: overdue ? 1 : 0,
    },
    ...(aiOn
      ? [
          {
            key: 'ask',
            href: isPremium ? ('/insights/chat' as Href) : paywallHref('ai'),
            locked: !isPremium,
            icon: 'chatbubble-ellipses-outline' as const,
            title: t('insights.tools.ask'),
            subtitle: t('insights.tools.askSub'),
          },
        ]
      : []),
    {
      key: 'experiments',
      href: '/insights/experiments' as Href,
      icon: 'flask-outline',
      title: t('insights.tools.experiments'),
      subtitle: running
        ? t('experiments.dayOf', { day: experimentDay, total: running.length_days })
        : t('insights.tools.experimentsSub'),
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.header} className="text-inkSecondary dark:text-gray">
        {t('insights.tools.title')}
      </Text>
      <View style={styles.card} className="bg-surface dark:bg-surfaceDark">
        {rows.map(({ key, ...row }, index) => (
          <Fragment key={key}>
            {index > 0 && <View style={styles.divider} className="bg-borderLight dark:bg-borderDark" />}
            <ToolRow {...row} />
          </Fragment>
        ))}
      </View>
    </View>
  );
}

// Explicit layout (by request): the row's spacing is given in exact points
// instead of NativeWind classes, so nothing in a wrapper can drop it.
const TILE = 44;
const ROW_PADDING_X = 16;
const TILE_GAP = 14;

const styles = StyleSheet.create({
  section: {
    // The screen's gap-7 (28) between sections, less 4, puts the header 24
    // below the insights card.
    marginTop: -4,
  },
  header: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 4,
    marginBottom: 10,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: ROW_PADDING_X,
    minHeight: 72,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: TILE_GAP,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 3,
  },
  badge: {
    marginLeft: 8,
    marginRight: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: OVERDUE_RED,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: '#FFFFFF',
  },
  lock: {
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    // Inset to where the text starts: 16 padding + 44 tile + 14 gap.
    marginLeft: ROW_PADDING_X + TILE + TILE_GAP,
  },
});
