import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { OakTree } from '@/components/OakTree';
import { useOakStage } from '@/hooks/useOakStage';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { DROP_LAND_MS, useCelebrationStore } from '@/store/useCelebrationStore';
import { haptics } from '@/utils/haptics';

const BOX_WIDTH = 140;
const BOX_HEIGHT = 440;
const OAK_HEIGHT = (BOX_WIDTH * 160) / 120;
const DROP_COLOR = '#3B9AE1';
// DROP_LAND_MS = DROP_DURATION_MS · sqrt(0.8): the drop reaches the oak at
// 80% of its eased (quad-in) travel. The "droplets" haptic and the oak's
// watered state both fire right then, so they land with the water.
const DROP_DURATION_MS = DROP_LAND_MS / Math.sqrt(0.8);
const DROP_START_Y = -24;
const DROP_END_Y = BOX_HEIGHT - OAK_HEIGHT - 10;

function WaterDrop() {
  const fall = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fall, {
      toValue: 1,
      duration: DROP_DURATION_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    const landing = setTimeout(haptics.droplets, DROP_LAND_MS);
    return () => {
      clearTimeout(landing);
      animation.stop();
      fall.setValue(0);
    };
  }, [fall]);

  const translateY = fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [DROP_START_Y, DROP_END_Y, DROP_END_Y] });
  const scale = fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 2, 5] });
  const opacity = fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: BOX_WIDTH / 2 - 8,
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Ionicons name="water" size={16} color={DROP_COLOR} />
    </Animated.View>
  );
}

// The oak, switched to `watered` when the drop lands. Mounted fresh per
// celebration (the host returns null while hidden), so the timer always
// starts from the drop's first frame.
function WateredOak() {
  const { stage } = useOakStage();
  const [watered, setWatered] = useState(false);

  useEffect(() => {
    const landing = setTimeout(() => setWatered(true), DROP_LAND_MS);
    return () => clearTimeout(landing);
  }, []);

  if (stage === null) return null;
  return <OakTree stage={stage} watered={watered} size={BOX_WIDTH} />;
}

// Plain in-tree overlay, not RN's <Modal> — same reasoning as ToastModalHost:
// this fires right as the check-in modal screen is dismissing (router.back()),
// and a real native Modal presenting at that exact moment races the navigator
// and can freeze touch input, mainly on Android. Rendered once at root, after
// the Stack, so paint order puts it on top; auto-dismisses on its own, so
// pointerEvents="none" throughout — there's nothing to tap.
export function WateringCelebrationHost() {
  const { t } = useTranslation();
  const visible = useCelebrationStore((state) => state.visible);

  if (!visible) return null;

  return (
    <View
      className="absolute inset-0 items-center justify-center gap-6 bg-background dark:bg-backgroundDark"
      pointerEvents="none"
    >
      <View style={{ width: BOX_WIDTH, height: BOX_HEIGHT }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: BOX_WIDTH, height: OAK_HEIGHT }}>
          <WateredOak />
        </View>
        <WaterDrop />
      </View>
      <Text className="text-lg font-semibold text-black dark:text-white">
        {t('home.wateringCelebrationText')}
      </Text>
    </View>
  );
}
