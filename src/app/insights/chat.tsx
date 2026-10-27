import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ui/ActionSheet';
import { useChatAboutData, type ChatMessage, type ChatResult } from '@/hooks/useChatAboutData';
import {
  CHAT_PERIODS,
  DEFAULT_CHAT_PERIOD,
  replyAsText,
  type ChatAnswer,
  type ChatPeriod,
  type ChatRedFlag,
  type ChatReply,
  type ComparisonCard,
} from '@/lib/chatReply';
import { formatOneDecimal, todayLocalDate } from '@/lib/dates';
import { formatCount } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { headerRightWithoutGlass } from '@/lib/navigation/headerItems';
import { colors } from '@/lib/theme';
import { usePhysioNotesStore } from '@/store/usePhysioNotesStore';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';

// AI assistant (design: assets/possible-app-design/chat). Three states:
//  - empty: heading, data-period chip, four starter questions
//  - conversation: user bubbles; assistant answers as bold lead + body, an
//    optional comparison card (numbers computed on the phone, see
//    lib/chatReply.ts), a caveat, "Based on …", "Add to the physio summary"
//    and follow-up chips
//  - red flag: a safety card (call 112 / log a flare-up) instead of analysis
// The edge function replies in a fixed JSON shape (structured outputs).

interface AssistantResult {
  reply: ChatReply;
  comparisons: ChatResult['comparisons'];
}

type ChatItem =
  | { role: 'user'; text: string }
  | { role: 'assistant'; question: string; period: ChatPeriod; result: AssistantResult };

const STARTERS = [
  { key: 'chat.starter1', icon: 'sunny-outline', tile: 'bg-amber-100', color: '#B7791F' },
  { key: 'chat.starter2', icon: 'moon-outline', tile: 'bg-indigo-100', color: '#4F46E5' },
  { key: 'chat.starter3', icon: 'flash-outline', tile: 'bg-red-100', color: '#B42318' },
  { key: 'chat.starter4', icon: 'barbell-outline', tile: 'bg-accentMuted', color: colors.accent },
] as const;

const BAR_TONE_COLORS = { warm: '#C98A1B', calm: colors.accent } as const;

function AssistantLabel() {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-accentMuted">
        <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
      </View>
      <Text className="text-[15px] font-semibold text-inkSecondary dark:text-gray">{t('chat.assistant')}</Text>
    </View>
  );
}

function ComparisonBars({ card }: { card: ComparisonCard }) {
  const { t, locale } = useTranslation();
  return (
    <View className="gap-2.5 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <Text className="text-base font-bold text-ink dark:text-white">{t(card.titleKey)}</Text>
      {card.rows.map((row) => (
        <View key={row.labelKey} className="flex-row items-center gap-3">
          <Text className="w-28 text-[15px] text-ink dark:text-white">{t(row.labelKey)}</Text>
          <View className="h-2.5 flex-1 overflow-hidden rounded-full bg-segmentTrack dark:bg-segmentTrackDark">
            {/* Width is a runtime value NativeWind can't express. */}
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, row.value * 10))}%`,
                backgroundColor: BAR_TONE_COLORS[row.tone],
              }}
            />
          </View>
          <Text className="w-10 text-right text-[15px] font-bold text-ink dark:text-white">
            {formatOneDecimal(row.value, locale)}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface AnswerProps {
  item: Extract<ChatItem, { role: 'assistant' }>;
  reply: ChatAnswer;
  isLast: boolean;
  onFollowUp: (question: string) => void;
}

function AnswerView({ item, reply, isLast, onFollowUp }: AnswerProps) {
  const { t, locale } = useTranslation();
  const addNote = usePhysioNotesStore((s) => s.addNote);
  const notes = usePhysioNotesStore((s) => s.notes);
  const card = reply.comparison ? item.result.comparisons[reply.comparison] : undefined;
  const noteText = [reply.lead, reply.body].filter(Boolean).join(' ');
  const isAdded = notes.some((n) => n.text === noteText);

  return (
    <View className="gap-3.5">
      <AssistantLabel />
      <Text className="text-[17px] leading-7 text-ink dark:text-white">
        {reply.lead ? <Text className="font-bold">{reply.lead} </Text> : null}
        {reply.body}
      </Text>
      {card && <ComparisonBars card={card} />}
      {reply.caveat ? (
        <Text className="text-[16px] leading-6 text-ink dark:text-white">{reply.caveat}</Text>
      ) : null}
      {card && (
        <Text className="text-[13px] text-inkSecondary dark:text-gray">
          {t('chat.basedOn', {
            count: formatCount(card.entries, card.entriesNoun, locale),
            days: item.period,
          })}
        </Text>
      )}

      <Pressable
        onPress={() => {
          if (isAdded) return;
          haptics.tick();
          addNote({ question: item.question, text: noteText, addedAt: todayLocalDate() });
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: isAdded }}
        className="flex-row items-center gap-2 self-start rounded-xl border border-accent px-4 py-3 active:opacity-70 dark:border-primaryDark"
        style={{ opacity: isAdded ? 0.6 : 1 }}
      >
        <Ionicons
          name={isAdded ? 'checkmark-circle-outline' : 'document-text-outline'}
          size={18}
          color={colors.accent}
        />
        <Text className="text-[15px] font-semibold text-accent dark:text-primaryDark">
          {t(isAdded ? 'chat.addedToSummary' : 'chat.addToSummary')}
        </Text>
      </Pressable>

      {isLast && reply.followUps.length > 0 && (
        <View className="items-start gap-2.5">
          {reply.followUps.map((question) => (
            <Pressable
              key={question}
              onPress={() => onFollowUp(question)}
              accessibilityRole="button"
              className="rounded-full bg-accentMuted px-4 py-3 active:opacity-70 dark:bg-segmentTrackDark"
            >
              <Text className="text-[16px] text-ink dark:text-white">{question}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function RedFlagView({ reply }: { reply: ChatRedFlag }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View className="gap-4">
      <View className="gap-3.5 rounded-3xl border border-[#F0C6C0] bg-[#FDEEEC] p-4 dark:border-[#5A2A25] dark:bg-[#2A1715]">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-[#4A2320]">
            <Ionicons name="warning-outline" size={22} color="#B42318" />
          </View>
          <Text className="flex-1 text-xl font-bold text-red-800 dark:text-red-300">{t('chat.redFlagTitle')}</Text>
        </View>
        <Text className="text-[17px] leading-7 text-ink dark:text-white">{reply.message}</Text>
        <Pressable
          onPress={() => void Linking.openURL('tel:112')}
          accessibilityRole="button"
          className="h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-red-700 active:opacity-80"
        >
          <Ionicons name="call-outline" size={20} color={colors.white} />
          <Text className="text-lg font-bold text-white">{t('chat.call112')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/flare-up/new' as Href)}
          accessibilityRole="button"
          className="h-12 items-center justify-center rounded-2xl border border-[#F0C6C0] bg-surface active:opacity-70 dark:border-[#5A2A25] dark:bg-surfaceDark"
        >
          <Text className="text-base font-bold text-red-800 dark:text-red-300">{t('chat.logFlareUp')}</Text>
        </Pressable>
      </View>
      <Text className="px-1 text-[15px] leading-6 text-inkSecondary dark:text-gray">{t('chat.redFlagFooter')}</Text>
    </View>
  );
}

// `?q=…` (from the Insights card's example chips) is sent as the first message.
export default function ChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const sentInitialRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [period, setPeriod] = useState<ChatPeriod>(DEFAULT_CHAT_PERIOD);
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const chatMutation = useChatAboutData(period);

  const scrollToEnd = () => requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || chatMutation.isPending) return;

    const history: ChatMessage[] = items.map((item) =>
      item.role === 'user'
        ? { role: 'user', content: item.text }
        : { role: 'assistant', content: replyAsText(item.result.reply) },
    );
    setItems((prev) => [...prev, { role: 'user', text: question }]);
    setInput('');
    scrollToEnd();

    const result = await chatMutation.mutateAsync([...history, { role: 'user', content: question }]);
    const { reply, comparisons } = result;
    if (result.error || !reply) {
      toast.error(result.error ?? t('chat.errorGeneric'));
      return;
    }
    setItems((prev) => [...prev, { role: 'assistant', question, period, result: { reply, comparisons } }]);
    scrollToEnd();
  };

  useEffect(() => {
    if (!q || sentInitialRef.current) return;
    sentInitialRef.current = true;
    void sendMessage(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on open
  }, [q]);

  const isEmpty = items.length === 0;
  const lastAssistantIndex = items.map((i) => i.role).lastIndexOf('assistant');
  const canSend = input.trim().length > 0 && !chatMutation.isPending;

  const newChat = (
    <Pressable
      onPress={() => {
        if (isEmpty) return;
        setItems([]);
        setInput('');
      }}
      accessibilityRole="button"
      accessibilityLabel={t('chat.newChat')}
      hitSlop={8}
      style={{ opacity: isEmpty ? 0.4 : 1 }}
    >
      <Ionicons name="create-outline" size={24} color={colors.accent} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-backgroundDark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ ...headerRightWithoutGlass(newChat) }} />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="grow gap-5 px-5 py-6"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {isEmpty ? (
          <View className="flex-1 gap-4">
            <View className="items-center gap-3 px-2">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-accentMuted dark:bg-segmentTrackDark">
                <Ionicons name="sparkles-outline" size={26} color={colors.accent} />
              </View>
              <Text className="text-center text-[28px] font-bold text-ink dark:text-white">{t('chat.heading')}</Text>
              <Text className="text-center text-[17px] leading-6 text-inkSecondary dark:text-gray">
                {t('chat.subtitle')}
              </Text>
              <Pressable
                onPress={() => setIsPeriodSheetOpen(true)}
                accessibilityRole="button"
                className="flex-row items-center gap-2 rounded-full border border-borderLight bg-surface px-4 py-2.5 active:opacity-70 dark:border-borderDark dark:bg-surfaceDark"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
                <Text className="text-[15px] font-semibold text-accent dark:text-primaryDark">
                  {t('chat.dataPeriod', { days: period })}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.accent} />
              </Pressable>
            </View>

            <View className="gap-3">
              {STARTERS.map((starter) => (
                <Pressable
                  key={starter.key}
                  onPress={() => void sendMessage(t(starter.key))}
                  accessibilityRole="button"
                  className="flex-row items-center gap-4 rounded-2xl bg-surface p-3.5 active:opacity-70 dark:bg-surfaceDark"
                >
                  <View className={`h-11 w-11 items-center justify-center rounded-xl ${starter.tile}`}>
                    <Ionicons name={starter.icon} size={22} color={starter.color} />
                  </View>
                  <Text className="flex-1 text-[17px] text-ink dark:text-white">{t(starter.key)}</Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-1 justify-end pt-4">
              <Text className="px-4 text-center text-[13px] leading-5 text-inkSecondary dark:text-gray">
                {t('chat.disclaimer')}
              </Text>
            </View>
          </View>
        ) : (
          items.map((item, index) => {
            if (item.role === 'user') {
              return (
                <View
                  key={index}
                  className="max-w-[88%] self-end rounded-2xl rounded-br-sm bg-[#DCE8DF] px-4 py-3.5 dark:bg-segmentTrackDark"
                >
                  <Text className="text-[17px] leading-6 text-ink dark:text-white">{item.text}</Text>
                </View>
              );
            }
            return item.result.reply.kind === 'red_flag' ? (
              <RedFlagView key={index} reply={item.result.reply} />
            ) : (
              <AnswerView
                key={index}
                item={item}
                reply={item.result.reply}
                isLast={index === lastAssistantIndex}
                onFollowUp={(question) => void sendMessage(question)}
              />
            );
          })
        )}

        {chatMutation.isPending && (
          <View className="gap-3">
            <AssistantLabel />
            <ActivityIndicator color={colors.accent} className="self-start" />
          </View>
        )}
      </ScrollView>

      <View
        className="flex-row items-end gap-3 border-t border-borderLight bg-background px-4 pt-3 dark:border-borderDark dark:bg-backgroundDark"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('chat.inputPlaceholder')}
          placeholderTextColor={colors.gray}
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => void sendMessage(input)}
          className="max-h-28 min-h-[48px] flex-1 rounded-3xl bg-segmentTrack px-5 py-3 text-[17px] text-ink dark:bg-segmentTrackDark dark:text-white"
        />
        <Pressable
          onPress={() => void sendMessage(input)}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={t('chat.send')}
          className="h-12 w-12 items-center justify-center rounded-full bg-accent"
          style={{ opacity: canSend ? 1 : 0.3 }}
        >
          <Ionicons name="arrow-up" size={24} color={colors.white} />
        </Pressable>
      </View>

      <ActionSheet
        visible={isPeriodSheetOpen}
        actions={CHAT_PERIODS.map((days) => ({
          label: t(`chat.period${days}`),
          onPress: () => {
            haptics.tick();
            setPeriod(days);
            setIsPeriodSheetOpen(false);
          },
        }))}
        onCancel={() => setIsPeriodSheetOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
