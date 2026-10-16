import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { FLOWER_JUMP_SVG } from '@/constants/flowerJumpSvg';
import { capitalize, currentDateFnsLocale } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import type { WrapSlide, WrapSlideKind, WrapTone } from '@/lib/wrap';

type TFunction = ReturnType<typeof useTranslation>['t'];

export interface WrapSlideViewProps {
  slide: WrapSlide;
  month: string; // yyyy-MM
  className?: string;
}

// Full-bleed background + text color per slide. Harder-news slides (pain
// change, flare-ups) sit on the calm bone/surface backgrounds rather than
// anything alarming — see the tone rule in src/lib/wrap.ts.
// `lightText` tells chrome drawn outside the slide (e.g. the close icon, a
// native prop that can't take a className) whether it sits on a dark fill.
export const SLIDE_STYLES: Record<WrapSlideKind, { container: string; text: string; lightText: boolean }> = {
  intro: { container: 'bg-primary dark:bg-primaryDark', text: 'text-white', lightText: true },
  consistency: { container: 'bg-primaryMuted dark:bg-primaryMutedDark', text: 'text-black dark:text-white', lightText: false },
  painFree: { container: 'bg-bone dark:bg-surfaceDark', text: 'text-black dark:text-white', lightText: false },
  painChange: { container: 'bg-surface dark:bg-surfaceDark', text: 'text-black dark:text-white', lightText: false },
  calmestWeek: { container: 'bg-primaryMuted dark:bg-primaryMutedDark', text: 'text-black dark:text-white', lightText: false },
  body: { container: 'bg-bone dark:bg-surfaceDark', text: 'text-black dark:text-white', lightText: false },
  training: { container: 'bg-primary dark:bg-primaryDark', text: 'text-white', lightText: true },
  flareUps: { container: 'bg-surface dark:bg-surfaceDark', text: 'text-black dark:text-white', lightText: false },
  sleep: { container: 'bg-primaryMuted dark:bg-primaryMutedDark', text: 'text-black dark:text-white', lightText: false },
  summary: { container: 'bg-primary dark:bg-primaryDark', text: 'text-white', lightText: true },
};

const TONE_ICONS: Record<WrapTone, keyof typeof Ionicons.glyphMap> = {
  better: 'trending-down',
  worse: 'trending-up',
  steady: 'remove',
};

interface SlideRow {
  label: string;
  value: string;
  detail?: string;
  tone?: WrapTone;
  // Range of motion: "up" is the good direction, so its arrow flips.
  higherIsBetter?: boolean;
}

interface SlideContent {
  eyebrow: string;
  big?: string;
  title: string;
  captions?: string[];
  rows?: SlideRow[];
  visual?: ReactNode;
}

const FLOWER_SIZE = 160;
const FLOWER_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; } svg { display: block; width: 100%; height: 100%; }</style></head><body>${FLOWER_JUMP_SVG}</body></html>`;

function one(value: number): string {
  return value.toFixed(1);
}

function monthName(month: string, pattern: string): string {
  return format(parseISO(`${month}-01`), pattern, { locale: currentDateFnsLocale() });
}

function formatDuration(minutes: number, t: TFunction): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return t('wrap.minutes', { m: rounded });
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m === 0 ? t('wrap.hoursOnly', { h }) : t('wrap.hours', { h, m });
}

function Flower() {
  return (
    <View style={{ width: FLOWER_SIZE, height: FLOWER_SIZE }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: FLOWER_HTML }}
        scrollEnabled={false}
        pointerEvents="none"
        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}

function checkmark() {
  return <AnimatedCheckmark size={96} color={colors.primary} fillColor={colors.primary} />;
}

function slideContent(slide: WrapSlide, month: string, t: TFunction): SlideContent {
  switch (slide.kind) {
    case 'intro':
      return {
        eyebrow: t('wrap.introEyebrow'),
        title: t('wrap.introTitle', { month: monthName(month, 'LLLL') }),
        captions: [t('wrap.introCaption', { days: slide.daysLogged })],
        visual: <Flower />,
      };
    case 'consistency':
      return {
        eyebrow: t('wrap.consistencyEyebrow'),
        big: `${slide.daysLogged}/${slide.daysInMonth}`,
        title: t('wrap.consistencyTitle'),
        captions: [
          t('wrap.consistencyStreak', { streak: slide.longestStreak }),
          ...(slide.fullDays > 0 ? [t('wrap.consistencyFullDays', { count: slide.fullDays })] : []),
        ],
      };
    case 'painFree':
      return {
        eyebrow: t('wrap.painFreeEyebrow'),
        big: String(slide.painFreeDays),
        title: t('wrap.painFreeTitle'),
        captions: [t('wrap.painFreeCaption')],
        visual: checkmark(),
      };
    case 'painChange': {
      const keys = {
        better: ['wrap.painBetterTitle', 'wrap.painBetterCaption'],
        worse: ['wrap.painWorseTitle', 'wrap.painWorseCaption'],
        steady: ['wrap.painSteadyTitle', 'wrap.painSteadyCaption'],
      }[slide.tone];
      return {
        eyebrow: t('wrap.painEyebrow'),
        big: one(slide.current),
        title: t(keys[0]),
        captions: [t(keys[1], { previous: one(slide.previous) })],
      };
    }
    case 'calmestWeek': {
      const locale = currentDateFnsLocale();
      const start = capitalize(format(parseISO(slide.weekStart), 'MMM d', { locale }));
      const end = capitalize(format(parseISO(slide.weekEnd), 'MMM d', { locale }));
      return {
        eyebrow: t('wrap.calmestEyebrow'),
        big: one(slide.average),
        title: `${start} – ${end}`,
        captions: [t('wrap.calmestCaption')],
      };
    }
    case 'body': {
      const rows: SlideRow[] = [];
      if (slide.stiffness) {
        rows.push({
          label: t('wrap.bodyStiffness'),
          value: one(slide.stiffness.current),
          detail: t('wrap.bodyWas', { previous: one(slide.stiffness.previous) }),
          tone: slide.stiffness.tone,
        });
      }
      if (slide.mobility) {
        rows.push({
          label: t('wrap.bodyMobility'),
          value: one(slide.mobility.current),
          detail: t('wrap.bodyWas', { previous: one(slide.mobility.previous) }),
          tone: slide.mobility.tone,
          higherIsBetter: true,
        });
      }
      return { eyebrow: t('wrap.bodyEyebrow'), title: t('wrap.bodyTitle'), rows };
    }
    case 'training':
      return {
        eyebrow: t('wrap.trainingEyebrow'),
        big: String(slide.sessions),
        title: t('wrap.trainingTitle'),
        captions: [
          t('wrap.trainingFull', { count: slide.fullSessions }),
          ...(slide.topExercise ? [t('wrap.trainingTop', slide.topExercise)] : []),
        ],
      };
    case 'flareUps': {
      const title =
        slide.count === 0
          ? t('wrap.flareZeroTitle')
          : t(
              {
                better: 'wrap.flareBetterTitle',
                worse: 'wrap.flareWorseTitle',
                steady: 'wrap.flareSteadyTitle',
              }[slide.tone],
            );
      const captions = [t('wrap.flarePrevious', { count: slide.previousCount })];
      if (slide.avgDurationMinutes != null) {
        captions.push(t('wrap.flareDuration', { duration: formatDuration(slide.avgDurationMinutes, t) }));
      }
      if (slide.tone === 'worse') captions.push(t('wrap.flareWorseCaption'));
      return {
        eyebrow: t('wrap.flareEyebrow'),
        big: slide.count === 0 ? undefined : String(slide.count),
        title,
        captions,
        visual: slide.count === 0 ? checkmark() : undefined,
      };
    }
    case 'sleep':
      return {
        eyebrow: t('wrap.sleepEyebrow'),
        big: one(slide.wellRestedPain),
        title: t('wrap.sleepTitle', { hours: slide.thresholdHours }),
        captions: [t('wrap.sleepCaption', { pain: one(slide.shortSleepPain) })],
      };
    case 'summary':
      return {
        eyebrow: '',
        title: t('wrap.summaryEyebrow', { month: capitalize(monthName(month, 'LLLL')) }),
        rows: [
          { label: t('wrap.summaryDays'), value: String(slide.daysLogged) },
          { label: t('wrap.summaryAvgPain'), value: one(slide.averagePain) },
          { label: t('wrap.summaryPainFree'), value: String(slide.painFreeDays) },
          { label: t('wrap.summarySessions'), value: String(slide.sessions) },
          { label: t('wrap.summaryFlareUps'), value: String(slide.flareUps) },
        ],
        captions: [t('wrap.summaryCaption')],
      };
  }
}

export function WrapSlideView({ slide, month, className }: WrapSlideViewProps) {
  const { t } = useTranslation();
  const styles = SLIDE_STYLES[slide.kind];
  const content = slideContent(slide, month, t);

  return (
    <View className={`flex-1 justify-center gap-6 px-8 ${className ?? ''}`}>
      {content.visual && <Animated.View entering={FadeInDown.duration(400)}>{content.visual}</Animated.View>}

      <View className="gap-2">
        {content.eyebrow !== '' && (
          <Animated.Text
            entering={FadeInDown.duration(400)}
            className={`text-sm font-semibold uppercase tracking-widest opacity-80 ${styles.text}`}
          >
            {content.eyebrow}
          </Animated.Text>
        )}
        {content.big && (
          <Animated.Text entering={FadeInDown.delay(150).duration(400)} className={`text-7xl font-bold ${styles.text}`}>
            {content.big}
          </Animated.Text>
        )}
        <Animated.Text entering={FadeInDown.delay(300).duration(400)} className={`text-3xl font-bold ${styles.text}`}>
          {content.title}
        </Animated.Text>
      </View>

      {content.rows && (
        <Animated.View entering={FadeInDown.delay(450).duration(400)} className="gap-4">
          {content.rows.map((row) => {
            const improved = row.tone === 'better';
            const icon = row.tone
              ? row.higherIsBetter && row.tone !== 'steady'
                ? TONE_ICONS[row.tone === 'better' ? 'worse' : 'better']
                : TONE_ICONS[row.tone]
              : undefined;
            return (
              <View key={row.label} className="flex-row items-center justify-between">
                <Text className={`text-lg ${styles.text}`}>{row.label}</Text>
                <View className="flex-row items-center gap-2">
                  {row.detail && <Text className={`text-sm opacity-70 ${styles.text}`}>{row.detail}</Text>}
                  {icon && (
                    <Ionicons name={icon} size={18} color={improved ? colors.primary : colors.gray} />
                  )}
                  <Text className={`text-2xl font-bold ${styles.text}`}>{row.value}</Text>
                </View>
              </View>
            );
          })}
        </Animated.View>
      )}

      {content.captions && (
        <Animated.View entering={FadeInDown.delay(600).duration(400)} className="gap-2">
          {content.captions.map((caption) => (
            <Text key={caption} className={`text-lg opacity-90 ${styles.text}`}>
              {caption}
            </Text>
          ))}
        </Animated.View>
      )}
    </View>
  );
}
