import { UnlockProgressSheet, type LockedTabMilestone } from '@/components/journey/UnlockProgressSheet';
import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { useJourney } from '@/hooks/useJourney';
import { useTodayStatus } from '@/hooks/useTodayStatus';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';

// Tabs that stay visible-but-locked until the new-user journey unlocks them
// (by logged days — see lib/journey.ts). Locked, not hidden, so new users can
// see what's coming.
const LOCKED_TAB_MILESTONES: Partial<Record<string, LockedTabMilestone>> = {
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
  const { morningDone, eveningDone } = useTodayStatus();
  // Locked History/Insights tab → unlock-progress bottom sheet (design from
  // assets/possible-app-design/message), replacing a plain toast.
  const [sheetMilestone, setSheetMilestone] = useState<LockedTabMilestone | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <Tabs
        // Tick only when actually switching tabs, not when re-tapping the
        // current one (`navigation` here is the pressed tab's own navigation).
        screenListeners={({ navigation, route }) => ({
          tabPress: (e) => {
            const milestone = LOCKED_TAB_MILESTONES[route.name];
            if (milestone && !isUnlocked(milestone)) {
              e.preventDefault();
              haptics.tick();
              setSheetMilestone(milestone);
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

      <UnlockProgressSheet
        milestone={sheetMilestone}
        loggedDays={state.loggedDays}
        loggedToday={morningDone || eveningDone}
        onClose={() => setSheetMilestone(null)}
      />
    </>
  );
}