import { YesNoField } from '@/components/checkin/YesNoField';
import { useExperiments, useLogExperimentDay } from '@/hooks/useExperiments';
import { asksOn } from '@/lib/experimentResult';
import { experimentTitle } from '@/lib/experimentText';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/utils/toast';

// Evening check-in, step 2: "Did you stick to … today?" while an experiment
// covers `date`. Optional (it never counts toward the step's required
// answer) and saved on tap, so the answer isn't tied to finishing the
// check-in. Renders nothing when no experiment is on.
export function ExperimentDayQuestion({ date }: { date: string }) {
  const { t } = useTranslation();
  const { current, daysFor } = useExperiments();
  const logDay = useLogExperimentDay();

  if (!current || !asksOn(current, date)) return null;
  const answer = daysFor(current.id).find((d) => d.date === date)?.followed ?? null;

  const handleChange = async (followed: boolean) => {
    const { error } = await logDay.mutateAsync({ experiment_id: current.id, date, followed });
    if (error) toast.error(error);
  };

  return (
    <YesNoField
      label={t('experiments.question', { title: experimentTitle(current, t) })}
      info={t('experiments.questionInfo')}
      value={answer}
      onChange={handleChange}
    />
  );
}
