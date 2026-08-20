
import { eachDayOfInterval, endOfWeek, format, isToday, startOfWeek } from 'date-fns';
import { enUS, lt } from 'date-fns/locale';
import { Pressable, Text, useColorScheme, View } from 'react-native';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { getPainColor } from '@/lib/painColor';

const DATE_FNS_LOCALES = { en: enUS, lt } as const;

function capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export interface DayMarker {
    hasMorning: boolean;
    hasEvening: boolean;
    hasFlareUp: boolean;
    avgPain: number | null;
}

export interface MonthCalendarProps {
    markers: Record<string, DayMarker>;
    onSelectDate: (date: string) => void;
    className?: string;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function WeekCalendar({ markers, onSelectDate, className }: MonthCalendarProps) {
    const { locale } = useTranslation();
    const dateFnsLocale = DATE_FNS_LOCALES[locale];
    const isDark = useColorScheme() === 'dark';
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
        <View className={`gap-3 border-primary dark:border-primaryDark border rounded-2xl bg-white p-2 dark:bg-surfaceDark ${className ?? ''}`}>
            <View className="flex-row items-center justify-end p-2" >
                <Text className="text-base font-semibold text-black dark:text-white">
                    {capitalize(format(today, 'MMMM yyyy', { locale: dateFnsLocale }))}
                </Text>
            </View>

            <View className="flex-row">
                {WEEKDAY_LABELS.map((label, index) => (
                    <View key={index} className="flex-1 items-center">
                        <Text className="text-xs font-medium text-gray-500 dark:text-gray">{label}</Text>
                    </View>
                ))}
            </View>

            <View className="flex-row">
                {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const marker = markers[dateStr];
                    const isCurrentDay = isToday(day);
                    const painColor = getPainColor(marker?.avgPain, isDark);

                    return (
                        <Pressable
                            key={dateStr}
                            onPress={() => onSelectDate(dateStr)}
                            className="flex-1 items-center gap-0.5 py-1.5"
                        >
                            <View
                                className={`h-8 w-8 items-center justify-center rounded-full ${isCurrentDay ? 'bg-primary dark:bg-primaryDark' : ''
                                    }`}
                                style={
                                    painColor
                                        ? isCurrentDay
                                            ? { borderWidth: 2, borderColor: painColor }
                                            : { backgroundColor: painColor }
                                        : undefined
                                }
                            >
                                <Text
                                    className={`text-sm ${isCurrentDay ? 'font-semibold text-white' : 'text-black dark:text-white'
                                        }`}
                                >
                                    {format(day, 'd')}
                                </Text>
                            </View>

                            <View className="h-3 flex-row gap-0.5">
                                {marker?.hasMorning && <View className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                                {marker?.hasEvening && <View className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                                {marker?.hasFlareUp && <View className="h-1.5 w-1.5 rounded-full bg-red-600" />}
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
