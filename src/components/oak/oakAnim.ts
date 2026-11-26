import { Ellipse, G, type GProps } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, type SharedValue } from 'react-native-reanimated';

import type { OakSoil } from '@/components/oak/oakConfig';

export const AnimatedG = Animated.createAnimatedComponent(G);
export const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export const LEAF_GROUP_COUNT = 2;
export const ACORN_COUNT = 5;

/**
 * Every animatable part of an oak stage, as shared values the parent
 * (WateringCelebration / GrowthCelebration) drives. A stage reads only the
 * parts it has; the rest stay at rest. Rotations are in degrees.
 */
export interface OakAnimValues {
  /** Opacity of the wet-soil copy drawn on top of the soil. */
  soilWet: SharedValue<number>;
  /** Body (everything but the ground shadow), pivoting at the soil center. */
  bodyRotate: SharedValue<number>;
  bodyScaleX: SharedValue<number>;
  bodyScaleY: SharedValue<number>;
  /** Seed: the acorn. */
  acornRotate: SharedValue<number>;
  /** Sprout/Sapling leaf groups. */
  leafRotate: SharedValue<number>[];
  leafScale: SharedValue<number>[];
  /** Young/Mighty canopy layers. */
  canopyBackRotate: SharedValue<number>;
  canopyFrontRotate: SharedValue<number>;
  /** Mighty: per-acorn bounce. */
  acornY: SharedValue<number>[];
}

// A fixed number of hook calls per render, so unrolled rather than looped
// over a variable length.
export function useOakAnimValues(): OakAnimValues {
  const soilWet = useSharedValue(0);
  const bodyRotate = useSharedValue(0);
  const bodyScaleX = useSharedValue(1);
  const bodyScaleY = useSharedValue(1);
  const acornRotate = useSharedValue(0);
  const leafRotate0 = useSharedValue(0);
  const leafRotate1 = useSharedValue(0);
  const leafScale0 = useSharedValue(1);
  const leafScale1 = useSharedValue(1);
  const canopyBackRotate = useSharedValue(0);
  const canopyFrontRotate = useSharedValue(0);
  const acornY0 = useSharedValue(0);
  const acornY1 = useSharedValue(0);
  const acornY2 = useSharedValue(0);
  const acornY3 = useSharedValue(0);
  const acornY4 = useSharedValue(0);

  return {
    soilWet,
    bodyRotate,
    bodyScaleX,
    bodyScaleY,
    acornRotate,
    leafRotate: [leafRotate0, leafRotate1],
    leafScale: [leafScale0, leafScale1],
    canopyBackRotate,
    canopyFrontRotate,
    acornY: [acornY0, acornY1, acornY2, acornY3, acornY4],
  };
}

/**
 * SVG affine matrix [a b c d e f] for
 * translate(tx,ty) · translate(px,py) · rotate(deg) · scale(sx,sy) · translate(-px,-py).
 * The pivot is explicit instead of relying on a transform origin.
 */
export function pivotMatrix(px: number, py: number, deg: number, sx = 1, sy = 1, tx = 0, ty = 0): number[] {
  'worklet';
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const a = cos * sx;
  const b = sin * sx;
  const c = -sin * sy;
  const d = cos * sy;
  return [a, b, c, d, tx + px - (a * px + c * py), ty + py - (b * px + d * py)];
}

/**
 * Animated props for an <AnimatedG>. `matrix` is react-native-svg's native
 * transform prop (what its JS `transform` is converted to). It isn't in the
 * public GProps type, but on Fabric Reanimated sends animated props straight
 * to the native view, so it lands there without a re-render.
 */
export function gMatrixProps(matrix: number[], opacity?: number): Partial<GProps> {
  'worklet';
  const props = opacity === undefined ? { matrix } : { matrix, opacity };
  return props as unknown as Partial<GProps>;
}

/** Body squash/stretch and sway, pivoting at the soil center. */
export function useBodyProps(anim: OakAnimValues, soil: OakSoil) {
  return useAnimatedProps(() =>
    gMatrixProps(pivotMatrix(soil.cx, soil.cy, anim.bodyRotate.get(), anim.bodyScaleX.get(), anim.bodyScaleY.get())),
  );
}

/** Rotate (and optionally uniformly scale) a part around (px, py). */
export function useRotateProps(rotate: SharedValue<number>, px: number, py: number, scale?: SharedValue<number>) {
  return useAnimatedProps(() => {
    const s = scale ? scale.get() : 1;
    return gMatrixProps(pivotMatrix(px, py, rotate.get(), s, s));
  });
}

export function useTranslateYProps(y: SharedValue<number>) {
  return useAnimatedProps(() => gMatrixProps([1, 0, 0, 1, 0, y.get()]));
}

export function useOpacityProps(opacity: SharedValue<number>) {
  return useAnimatedProps(() => ({ opacity: opacity.get() }));
}

export const WET_SOIL_COLOR = '#3A271A';
