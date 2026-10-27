import { useState } from 'react';

import { useCheckinHistory } from '@/hooks/useCheckins';
import { useFlareUps } from '@/hooks/useFlareUps';
import { usePhysioAssessments } from '@/hooks/usePhysioAssessments';
import { useProfile } from '@/hooks/useProfile';
import { todayLocalDate } from '@/lib/dates';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { buildVisitReportHtml, visitReportPeriod } from '@/lib/visitReport';
import { toast } from '@/utils/toast';

// "Prepare a summary for the visit": the user's own data since the last
// visit (src/lib/visitReport.ts) → PDF (expo-print) → share sheet
// (expo-sharing). Both native modules are loaded only on tap, so an older
// build without them shows a message instead of crashing the Insights tab.
export function useVisitReport() {
  const { t, locale } = useTranslation();
  const { checkins } = useCheckinHistory(365);
  const { flareUps } = useFlareUps(365);
  const { assessments } = usePhysioAssessments();
  const { profile } = useProfile();
  const [isPreparing, setIsPreparing] = useState(false);
  const period = visitReportPeriod(assessments[0], todayLocalDate());

  const share = async () => {
    if (isPreparing) return;
    setIsPreparing(true);
    try {
      const [Print, Sharing] = await Promise.all([import('expo-print'), import('expo-sharing')]);
      const html = buildVisitReportHtml({
        period,
        checkins,
        flareUps,
        injuryDescription: profile?.injury_description,
        locale,
        t,
      });
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        toast.error(t('visitReport.shareUnavailable'));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: t('visitReport.title'),
      });
    } catch {
      toast.error(t('visitReport.failed'));
    } finally {
      setIsPreparing(false);
    }
  };

  return { share, isPreparing, sinceLastVisit: period.sinceLastVisit };
}
