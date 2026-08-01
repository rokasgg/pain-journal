import { useLocalSearchParams, useRouter } from 'expo-router';

import { CheckinForm, type CheckinFormData } from '@/components/checkin/CheckinForm';
import { useUpsertCheckin } from '@/hooks/useCheckins';
import { todayLocalDate } from '@/lib/dates';
import { toast } from '@/utils/toast';

export default function CheckinModal() {
  const { type } = useLocalSearchParams<{ type: 'morning' | 'evening' }>();
  const isMorning = type === 'morning';
  const router = useRouter();
  const upsertCheckin = useUpsertCheckin();

  const handleSubmit = async (data: CheckinFormData) => {
    const { error } = await upsertCheckin.mutateAsync({
      type: isMorning ? 'morning' : 'evening',
      checkin_date: todayLocalDate(),
      ...data,
    });

    if (error) {
      toast.error(error);
      return;
    }

    toast.success(`${isMorning ? 'Morning' : 'Evening'} check-in saved!`);
    router.back();
  };

  return <CheckinForm type={isMorning ? 'morning' : 'evening'} submitLabel="Save Check-in" onSubmit={handleSubmit} />;
}
