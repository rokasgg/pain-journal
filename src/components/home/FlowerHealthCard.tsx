import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useFlowerHealth } from '@/hooks/useFlowerHealth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { colors } from '@/lib/theme';

const ICON_SIZE = 40;
const SVG_WIDTH = 56;
const SVG_HEIGHT = 96;

function stageHtml(svg: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      svg { display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
}

export function FlowerHealthCard() {
  const { t } = useTranslation();
  const { stage } = useFlowerHealth();

  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-4 dark:bg-surfaceDark">
      <View style={{ width: SVG_WIDTH, height: SVG_HEIGHT }} className="items-center justify-center">
        {stage.svg ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: stageHtml(stage.svg) }}
            scrollEnabled={false}
            pointerEvents="none"
            style={{ flex: 1, backgroundColor: 'transparent' }}
            containerStyle={{ backgroundColor: 'transparent' }}
          />
        ) : (
          <Ionicons name={stage.icon} size={ICON_SIZE} color={colors.primary} style={{ opacity: stage.iconOpacity }} />
        )}
      </View>
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold text-black dark:text-white">{t('home.flowerHealthTitle')}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{t(stage.labelKey)}</Text>
      </View>
    </View>
  );
}
