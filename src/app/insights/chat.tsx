import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { type ChatMessage, useChatAboutData } from '@/hooks/useChatAboutData';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { toast } from '@/utils/toast';

export default function ChatScreen() {
  const { t } = useTranslation();
  const chatMutation = useChatAboutData();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const suggestedPrompts = [
    t('insights.chatPrompt1'),
    t('insights.chatPrompt2'),
    t('insights.chatPrompt3'),
    t('insights.chatPrompt4'),
  ];

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    const { reply, error } = await chatMutation.mutateAsync(nextMessages);

    if (error || !reply) {
      toast.error(error ?? t('insights.chatErrorGeneric'));
      return;
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background dark:bg-backgroundDark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-3 px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <View className="gap-2">
            {suggestedPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => sendMessage(prompt)}
                className="rounded-xl border-primary bg-primaryMuted px-4 py-3 dark:border-primaryDark dark:bg-primaryMutedDark"
              >
                <Text className="text-sm font-medium text-strongGray dark:text-white">{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {messages.map((message, index) => (
          <View
            key={index}
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === 'user'
              ? 'self-end bg-primary dark:bg-primaryDark'
              : 'self-start bg-surface dark:bg-surfaceDark'
              }`}
          >
            <Text className={message.role === 'user' ? 'text-white' : 'text-black dark:text-white'}>
              {message.content}
            </Text>
          </View>
        ))}

        {chatMutation.isPending && (
          <View className="max-w-[85%] self-start rounded-2xl bg-surface px-4 py-3 dark:bg-surfaceDark">
            <ActivityIndicator color={colors.gray} />
          </View>
        )}
      </ScrollView>

      <View className="flex-row items-center gap-2 border-t border-gray px-4 py-3 dark:border-gray-800 h-24 mb-4">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('insights.chatInputPlaceholder')}
          placeholderTextColor={colors.gray}
          multiline
          className="max-h-24 flex-1 rounded-xl  border-gray-300 bg-surface px-3 py-4 text-black dark:border-gray-700 dark:bg-surfaceDark dark:text-white"
        />
        <Pressable
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || chatMutation.isPending}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary disabled:opacity-40 dark:bg-primaryDark"
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
