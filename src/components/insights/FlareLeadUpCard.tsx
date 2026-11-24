import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useFlareDetective } from '@/hooks/useFlareDetective';
import type { DetectiveFlareUp } from '@/lib/flareDetective';
import { deviationDetail, deviationLabel, factorKey } from '@/lib/flareDetectiveText';
import { useTranslation } from '@/lib/i18n/useTranslation';

const FLARE_COLOR = '#B4532A';

// Flare-up detail → "Before this flare-up": what was off in the day before it
// compared with the user's own usual days (src/lib/flareDetective.ts). Says
// so plainly when nothing stood out, or when nothing was logged to compare.
export function FlareLeadUpCard({ flareUp }: { flareUp: DetectiveFlareUp }) {
  const { t, locale } = useTranslation();
  const { leadUpFor, isLoading } = useFlareDetective();
  if (isLoading) return null;

  const leadUp = leadUpFor(flareUp);
  const empty =
    leadUp.checked === 0 ? t('insights.flares.lead.nothingLogged') : t('insights.flares.lead.nothingUnusual');

  return (
    <View className="gap-3 rounded-[18px] bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-[13px] font-semibold uppercase tracking-wide text-inkSecondary dark:text-gray">
        {t('insights.flares.lead.title')}
      </Text>
      {leadUp.deviations.length === 0 ? (
        <Text className="text-[15px] text-ink dark:text-white">{empty}</Text>
      ) : (
        leadUp.deviations.map((deviation) => {
          const detail = deviationDetail(deviation, t, locale);
          return (
            <View key={factorKey(deviation.factor, deviation.direction)} className="flex-row gap-3">
              <Ionicons name="ellipse" size={8} color={FLARE_COLOR} style={{ marginTop: 8 }} />
              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-ink dark:text-white">{deviationLabel(deviation, t)}</Text>
                {detail && <Text className="text-[14px] text-inkSecondary dark:text-gray">{detail}</Text>}
              </View>
            </View>
          );
        })
      )}
      <Text className="text-[13px] text-inkSecondary dark:text-gray">{t('insights.flares.lead.footnote')}</Text>
    </View>
  );
}
