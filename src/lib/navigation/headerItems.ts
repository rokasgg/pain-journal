import type { ReactElement } from 'react';
import { Platform } from 'react-native';

// Stack.Screen options for a custom right-side header element WITHOUT iOS 26's
// "Liquid Glass" bubble. iOS only lets you hide that shared background on
// custom bar items (`hidesSharedBackground`), which `headerRight` doesn't
// expose — so iOS uses `unstable_headerRightItems`, everything else keeps the
// plain `headerRight`. Spread into `options`:
//   <Stack.Screen options={{ ...headerRightWithoutGlass(<Button />) }} />
export function headerRightWithoutGlass(element: ReactElement) {
  if (Platform.OS === 'ios') {
    return {
      unstable_headerRightItems: () => [{ type: 'custom' as const, element, hidesSharedBackground: true }],
    };
  }
  return { headerRight: () => element };
}
