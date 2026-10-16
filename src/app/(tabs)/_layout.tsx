import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, useColorScheme, View } from 'react-native';

function TabButton({
  name,
  label,
  focused,
  size,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  size: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={{

        // flexDirection: focused ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        // backgroundColor: focused ? (isDark ? colors.primaryMutedDark : colors.selectedTabColor) : 'transparent',

        borderRadius: 999,
        paddingHorizontal: focused ? 14 : 0,
        height: 60,
        minWidth: 100,
      }}
    >
      <Ionicons name={name} size={size} color={focused ? colors.selectedTab : colors.lightGrey} />

      <Text
        numberOfLines={1}
        style={{ color: colors.selectedTab, fontSize: 12, fontWeight: '600' }}
      >
        {label}
      </Text>

    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      // Tick only when actually switching tabs, not when re-tapping the
      // current one (`navigation` here is the pressed tab's own navigation).
      screenListeners={({ navigation }) => ({
        tabPress: () => {
          if (!navigation.isFocused()) haptics.tick();
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // <-- svarbiausia: išjungiam default label
        tabBarActiveTintColor: colors.selectedTab,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: {
          backgroundColor: isDark ? colors.backgroundDark : colors.background,
          borderTopColor: isDark ? colors.borderDark : colors.borderLight,
          height: 80,

          paddingBottom: 20,
          paddingTop: 15,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused, size }) => (
            <TabButton name="home" label={t('tabs.home')} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ focused, size }) => (
            <TabButton name="stats-chart" label={t('tabs.history')} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('tabs.insights'),
          tabBarIcon: ({ focused, size }) => (
            <TabButton name="bulb" label={t('tabs.insights')} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ focused, size }) => (
            <TabButton name="settings" label={t('tabs.settings')} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}