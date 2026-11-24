import { Text, useColorScheme, View } from 'react-native';

import type { DayState } from '@/lib/experimentResult';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const SKIPPED = '#C98A6B';

// One dot per planned day: filled green = stuck to it, warm ring = didn't,
// dashed = no answer yet, faint = still to come. State goes through `style`,
// never a className swap (the NativeWind remount gotcha).
export function ExperimentDots({ states, showLegend = false }: { states: DayState[]; showLegend?: boolean }) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const track = isDark ? colors.segmentTrackDark : colors.segmentTrack;
  const accent = isDark ? colors.primaryDark : colors.accent;

  const dotStyle = (state: DayState) => ({
    backgroundColor: state === 'followed' ? accent : state === 'upcoming' ? track : 'transparent',
    borderColor: state === 'followed' ? accent : state === 'skipped' ? SKIPPED : state === 'unanswered' ? accent : track,
    borderStyle: state === 'unanswered' ? ('dashed' as const) : ('solid' as const),
  });

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-1.5">
        {states.map((state, index) => (
          <View key={index} className="h-4 w-4 rounded-full border-2" style={dotStyle(state)} />
        ))}
      </View>
      {showLegend && (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {(['followed', 'skipped', 'unanswered'] as const).map((state) => (
            <View key={state} className="flex-row items-center gap-1.5">
              <View className="h-3 w-3 rounded-full border-2" style={dotStyle(state)} />
              <Text className="text-[13px] text-inkSecondary dark:text-gray">
                {t(
                  state === 'followed'
                    ? 'experiments.legendFollowed'
                    : state === 'skipped'
                      ? 'experiments.legendSkipped'
                      : 'experiments.legendUnanswered',
                )}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
