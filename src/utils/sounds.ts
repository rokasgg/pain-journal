import checkinChime from '../../assets/sounds/checkin-chime.wav';
import milestoneChime from '../../assets/sounds/milestone-chime.wav';

import { useSoundStore } from '@/store/useSoundStore';

// The app's sounds, and the only file allowed to import expo-audio. Like
// haptics.ts, callers use the semantic helper and every call is
// fire-and-forget. expo-audio is loaded with a dynamic import() and every
// call is guarded, so a build made before the native module was added
// stays silent instead of crashing (same idea as healthkit.ts).
//
// The audio session respects the iPhone's silent switch and mixes with
// whatever the user is listening to: a chime should never pause their music.

type ExpoAudio = typeof import('expo-audio');
type Player = ReturnType<ExpoAudio['createAudioPlayer']>;

const SOURCES = { celebrate: checkinChime, milestone: milestoneChime };
type SoundName = keyof typeof SOURCES;

const VOLUME = 0.6;

let audioPromise: Promise<ExpoAudio | null> | null = null;
const players: Partial<Record<SoundName, Player>> = {};

function loadAudio(): Promise<ExpoAudio | null> {
  audioPromise ??= import('expo-audio')
    .then(async (audio) => {
      await audio.setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
      return audio;
    })
    .catch(() => null);
  return audioPromise;
}

async function play(name: SoundName) {
  if (!useSoundStore.getState().enabled) return;
  try {
    const audio = await loadAudio();
    if (!audio) return;
    let player = players[name];
    if (!player) {
      player = audio.createAudioPlayer(SOURCES[name]);
      player.volume = VOLUME;
      players[name] = player;
    }
    await player.seekTo(0);
    player.play();
  } catch {
    // A sound is a nicety; never let it break the flow.
  }
}

export const sounds = {
  /** Loads the module and the session ahead of the moment it's needed, so the first chime isn't late. */
  prepare: () => {
    if (useSoundStore.getState().enabled) void loadAudio();
  },
  /** A check-in was newly logged (plays as the water drop lands on the oak). */
  celebrate: () => void play('celebrate'),
  /** A rarer moment: the oak grew, a feature unlocked, a round number of days. */
  milestone: () => void play('milestone'),
};
