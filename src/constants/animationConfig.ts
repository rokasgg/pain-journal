// Central place to tune timing for success/confirmation animations
// (AnimatedCheckmark and anything similar added later) without hunting
// through component code for magic numbers.
export const animationConfig = {
  // Stage 1: circle border draws itself (strokeDashoffset → 0).
  circleDuration: 750,
  // Stage 2: checkmark path draws itself, starting right after the circle
  // finishes — chained via a callback, not a fixed total duration, so the
  // sequence stays correct regardless of frame rate/dropped frames.
  checkmarkDuration: 450,
  // Small pause between circle finishing and checkmark starting, so the
  // checkmark doesn't feel like it's racing the circle's tail end.
  checkmarkDelay: 80,
  // Stage 3: how long the finished checkmark stays fully visible before
  // onAnimationComplete fires — gives the eye a moment to register "done"
  // instead of immediately cutting away/navigating.
  holdDuration: 500,
} as const;
