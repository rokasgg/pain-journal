import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useFlowerHealth } from '@/hooks/useFlowerHealth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';
import { useCelebrationStore } from '@/store/useCelebrationStore';

const BOX_WIDTH = 140;
const BOX_HEIGHT = 440;
const FLOWER_HEIGHT = 180;
const DROP_COLOR = '#3B9AE1';
const DROP_DURATION_MS = 1350;
const DROP_START_Y = -24;
const DROP_END_Y = BOX_HEIGHT - FLOWER_HEIGHT - 10;

function flowerHtml(svg: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=${BOX_WIDTH}, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: transparent; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
}

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
    return () => {
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

// Plain in-tree overlay, not RN's <Modal> — same reasoning as ToastModalHost:
// this fires right as the check-in modal screen is dismissing (router.back()),
// and a real native Modal presenting at that exact moment races the navigator
// and can freeze touch input, mainly on Android. Rendered once at root, after
// the Stack, so paint order puts it on top; auto-dismisses on its own, so
// pointerEvents="none" throughout — there's nothing to tap.
export function WateringCelebrationHost() {
  const { t } = useTranslation();
  const visible = useCelebrationStore((state) => state.visible);
  const { stage } = useFlowerHealth();

  if (!visible) return null;

  return (
    <View
      className="absolute inset-0 items-center justify-center gap-6 bg-background dark:bg-backgroundDark"
      pointerEvents="none"
    >
      <View style={{ width: BOX_WIDTH, height: BOX_HEIGHT }}>
        <View style={{ position: 'absolute', bottom: 0, left: 0, width: BOX_WIDTH, height: FLOWER_HEIGHT }}>
          {stage.svg ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: flowerHtml(stage.svg) }}
              scrollEnabled={false}
              pointerEvents="none"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
              containerStyle={{ backgroundColor: 'transparent' }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name={stage.icon} size={64} color={colors.primary} style={{ opacity: stage.iconOpacity }} />
            </View>
          )}
        </View>
        <WaterDrop />
      </View>
      <Text className="text-lg font-semibold text-black dark:text-white">
        {t('home.wateringCelebrationText')}
      </Text>
    </View>
  );
}
