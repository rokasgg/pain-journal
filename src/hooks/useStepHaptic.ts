import { useEffect, useRef } from 'react';

import { haptics } from '@/utils/haptics';

// Light "page turn" tap whenever a wizard's step key changes — covers every
// way of moving (Next, Back, jump-to-step, summary "Edit") from one place
// instead of a call per button. Skips the first render. Final Save buttons
// don't change the step, so they stay silent until the save actually lands
// (then the success toast's own haptic fires).
export function useStepHaptic(step: string | number) {
  const previous = useRef(step);

  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    haptics.tap();
  }, [step]);
}
