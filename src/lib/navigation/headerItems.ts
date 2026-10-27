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

// Same idea for the left side: a custom back element without the iOS 26
// bubble. Used where "back" must do something other than leave the screen
// (the check-in wizard steps back one page). iOS uses
// `unstable_headerLeftItems`; elsewhere a plain `headerLeft`.
export function headerLeftWithoutGlass(element: ReactElement) {
  if (Platform.OS === 'ios') {
    return {
      unstable_headerLeftItems: () => [{ type: 'custom' as const, element, hidesSharedBackground: true }],
    };
  }
  return { headerLeft: () => element };
}
