import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MilestoneKey } from '@/lib/journey';

// Which journey milestones already got their one-time "✨ New: …" card on
// this device. `initialize` runs once per device: everything *already*
// unlocked at that point is marked announced silently, so existing users with
// weeks of data don't get a pile of "New: History!" cards for features they
// already use — only milestones reached from then on are announced.
interface JourneyStoreState {
  initialized: boolean;
  announced: MilestoneKey[];
  // User ids that have already seen the full-screen welcome guide. Keyed per
  // account, not per device, so every account gets it on its first time in
  // the app — including a second person signing in on the same phone.
  welcomeSeenBy: string[];
  initialize: (alreadyUnlocked: MilestoneKey[]) => void;
  markAnnounced: (key: MilestoneKey) => void;
  markWelcomeSeen: (userId: string) => void;
}

export const useJourneyStore = create<JourneyStoreState>()(
  persist(
    (set) => ({
      initialized: false,
      announced: [],
      welcomeSeenBy: [],
      initialize: (alreadyUnlocked) =>
        set((state) => (state.initialized ? state : { initialized: true, announced: alreadyUnlocked })),
      markAnnounced: (key) =>
        set((state) => (state.announced.includes(key) ? state : { announced: [...state.announced, key] })),
      markWelcomeSeen: (userId) =>
        set((state) => (state.welcomeSeenBy.includes(userId) ? state : { welcomeSeenBy: [...state.welcomeSeenBy, userId] })),
    }),
    {
      name: 'journey-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
