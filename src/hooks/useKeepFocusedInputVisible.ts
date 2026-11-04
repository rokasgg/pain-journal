import { useEffect, useRef } from 'react';
import { Keyboard, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';

// Space kept between the focused field and the keyboard (or the screen's
// pinned footer button above it).
const MARGIN = 24;

// Keeps the focused text field visible in a form's ScrollView: when the
// keyboard opens (and when focus moves to another field), and while a
// multiline note grows as the user types. Spread the result onto the
// ScrollView: `<ScrollView {...keepFocusedVisible} …>`.
//
// Everything is measured in window coordinates against the keyboard's top
// edge, so it works whether the screen makes room by shrinking
// (KeyboardAvoidingView, Android resize) or by insets
// (`automaticallyAdjustKeyboardInsets`, where the ScrollView keeps its height).
export function useKeepFocusedInputVisible() {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  // Window y of the keyboard's top edge, while it's open.
  const keyboardTop = useRef<number | null>(null);

  const reveal = () => {
    const input = TextInput.State.currentlyFocusedInput();
    const scrollView = scrollRef.current?.getNativeScrollRef();
    const keyboardY = keyboardTop.current;
    if (!input || !scrollView || keyboardY === null) return;
    scrollView.measureInWindow((_sx, viewTop, _sw, viewHeight) => {
      input.measureInWindow((_x, fieldTop, _w, fieldHeight) => {
        const visibleTop = viewTop;
        const visibleBottom = Math.min(viewTop + viewHeight, keyboardY);
        const below = fieldTop + fieldHeight + MARGIN - visibleBottom;
        const above = visibleTop - (fieldTop - MARGIN);
        // A note taller than the space left keeps its bottom (the caret) in view.
        if (below > 0) {
          scrollRef.current?.scrollTo({ y: scrollY.current + below, animated: true });
        } else if (above > 0) {
          scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current - above), animated: true });
        }
      });
    });
  };

  useEffect(() => {
    // "Did" events: by then the screen has finished making room for the
    // keyboard. iOS sends it again when focus moves to another field.
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      requestAnimationFrame(reveal);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
    // reveal only reads refs, so subscribing once is enough.
  }, []);

  return {
    ref: scrollRef,
    scrollEventThrottle: 16,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
    },
    // A multiline note grew a line: keep the caret's line above the keyboard.
    onContentSizeChange: () => reveal(),
  };
}
