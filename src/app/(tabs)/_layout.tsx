import { MILESTONE_LABEL_KEYS } from '@/components/home/JourneyCard';
import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { useJourney } from '@/hooks/useJourney';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { JOURNEY_MILESTONES, type MilestoneKey } from '@/lib/journey';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { toast } from '@/utils/toast';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, useColorScheme, View } from 'react-native';

// Tabs that stay visible-but-locked until the new-user journey unlocks them
// (by logged days — see lib/journey.ts). Locked, not hidden, so new users can
// see what's coming.
const LOCKED_TAB_MILESTONES: Partial<Record<string, MilestoneKey>> = {
  history: 'history',
  insights: 'insights',
};

function TabButton({
  name,
  label,
  focused,
  size,
  locked = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  size: number;
  locked?: boolean;
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
      <Ionicons
        name={locked ? 'lock-closed' : name}
        size={size}
        color={focused && !locked ? colors.selectedTab : colors.lightGrey}
      />

      <Text
        numberOfLines={1}
        style={{ color: locked ? colors.lightGrey : colors.selectedTab, fontSize: 12, fontWeight: '600' }}
      >
        {label}
      </Text>

    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { state, isUnlocked } = useJourney();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      // Tick only when actually switching tabs, not when re-tapping the
      // current one (`navigation` here is the pressed tab's own navigation).
      screenListeners={({ navigation, route }) => ({
        tabPress: (e) => {
          const milestone = LOCKED_TAB_MILESTONES[route.name];
          if (milestone && !isUnlocked(milestone)) {
            e.preventDefault();
            haptics.tick();
            const total = JOURNEY_MILESTONES.find((m) => m.key === milestone)?.days ?? 0;
            toast.info(
              t('journey.lockedTab', {
                feature: t(MILESTONE_LABEL_KEYS[milestone]),
                total,
                count: Math.max(total - state.loggedDays, 1),
              }),
            );
            return;
          }
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
          height: TAB_BAR_HEIGHT,

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
            <TabButton
              name="stats-chart"
              label={t('tabs.history')}
              focused={focused}
              size={size}
              locked={!isUnlocked('history')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: t('tabs.insights'),
          tabBarIcon: ({ focused, size }) => (
            <TabButton
              name="bulb"
              label={t('tabs.insights')}
              focused={focused}
              size={size}
              locked={!isUnlocked('insights')}
            />
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