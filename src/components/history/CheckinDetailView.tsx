import { Text, View } from 'react-native';

import { formatCheckinDate } from '@/lib/dates';
import type { Checkin } from '@/types/database.types';

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;

  return (
    <View className="flex-row items-center justify-between border-b border-gray-200 py-3 dark:border-gray-800">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{label}</Text>
      <Text className="text-base text-black dark:text-white">{value}</Text>
    </View>
  );
}

export interface CheckinDetailViewProps {
  checkin: Checkin;
  showDate?: boolean;
}

export function CheckinDetailView({ checkin, showDate = true }: CheckinDetailViewProps) {
  const symptomLabels = [
    checkin.symptoms.tingling && 'Tingling',
    checkin.symptoms.numbness && 'Numbness',
    checkin.symptoms.headache && 'Headache',
  ].filter(Boolean) as string[];

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold capitalize text-black dark:text-white">
          {checkin.type} check-in
        </Text>
        {showDate && (
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {formatCheckinDate(checkin.checkin_date)}
          </Text>
        )}
      </View>

      <View>
        <DetailRow label="Pain level" value={checkin.pain_level} />
        <DetailRow label="Stiffness" value={checkin.stiffness_level} />
        <DetailRow label="Range of motion" value={checkin.range_of_motion} />

        {checkin.type === 'morning' && (
          <>
            <DetailRow label="Sleep quality" value={checkin.sleep_quality} />
            <DetailRow label="Sleep hours" value={checkin.sleep_hours} />
            <DetailRow label="Woke up with pain" value={checkin.woke_up_with_pain ? 'Yes' : 'No'} />
            <DetailRow label="Sleep position" value={checkin.sleep_position} />
          </>
        )}

        {checkin.type === 'evening' && (
          <>
            <DetailRow label="Activity level" value={checkin.activity_level} />
            <DetailRow label="Screen time (hours)" value={checkin.screen_time_hours} />
            <DetailRow label="Did exercises" value={checkin.did_exercises ? 'Yes' : 'No'} />
            <DetailRow label="Exercise hours" value={checkin.exercise_hours} />
            <DetailRow label="Exercise intensity" value={checkin.exercise_intensity} />
          </>
        )}
      </View>

      {symptomLabels.length > 0 && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            Symptoms
          </Text>
          <Text className="text-base text-black dark:text-white">{symptomLabels.join(', ')}</Text>
          {checkin.symptoms.radiating_to && (
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Radiating to: {checkin.symptoms.radiating_to}
            </Text>
          )}
        </View>
      )}

      {checkin.triggers.length > 0 && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            Triggers
          </Text>
          <Text className="text-base text-black dark:text-white">{checkin.triggers.join(', ')}</Text>
        </View>
      )}

      {checkin.exercise_notes && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
            Exercise notes
          </Text>
          <Text className="text-base text-black dark:text-white">{checkin.exercise_notes}</Text>
        </View>
      )}

      {checkin.notes && (
        <View className="gap-1">
          <Text className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">Notes</Text>
          <Text className="text-base text-black dark:text-white">{checkin.notes}</Text>
        </View>
      )}
    </View>
  );
}
