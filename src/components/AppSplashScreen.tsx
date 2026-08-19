import { useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { FLOWER_JUMP_SVG } from '@/constants/flowerJumpSvg';

const SVG_WIDTH = 200;
const SVG_HEIGHT = 300;

const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=${SVG_WIDTH}, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    ${FLOWER_JUMP_SVG}
  </body>
</html>`;

export function AppSplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;

  const handleLoadEnd = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-backgroundDark">
      <Animated.View style={{ width: SVG_WIDTH, height: SVG_HEIGHT, opacity }}>
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          scrollEnabled={false}
          pointerEvents="none"
          onLoadEnd={handleLoadEnd}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          containerStyle={{ backgroundColor: 'transparent' }}
        />
      </Animated.View>
      <Text className="text-4xl font-bold text-black dark:text-white">Pain Journal</Text>
    </View>
  );
}
