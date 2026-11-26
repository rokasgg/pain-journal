import type { ComponentType } from 'react';

import { OakMighty } from '@/components/oak/stages/OakMighty';
import type { OakStageProps } from '@/components/oak/stages/OakParts';
import { OakSapling } from '@/components/oak/stages/OakSapling';
import { OakSeed } from '@/components/oak/stages/OakSeed';
import { OakSprout } from '@/components/oak/stages/OakSprout';
import { OakYoung } from '@/components/oak/stages/OakYoung';
import type { OakStage } from '@/lib/oak';

/** The animated stage component for each oak stage. */
export const OAK_STAGE_COMPONENTS: Record<OakStage, ComponentType<OakStageProps>> = {
  1: OakSeed,
  2: OakSprout,
  3: OakSapling,
  4: OakYoung,
  5: OakMighty,
};
