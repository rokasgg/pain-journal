import type { ComponentType } from 'react';

import { OakMighty } from '@/components/oak/stages/OakMighty';
import type { OakStageProps } from '@/components/oak/stages/OakParts';
import { OakSapling } from '@/components/oak/stages/OakSapling';
import { OakSeed } from '@/components/oak/stages/OakSeed';
import { OakSprout } from '@/components/oak/stages/OakSprout';
import { OakYoung } from '@/components/oak/stages/OakYoung';

/** Stage components in OAK_STAGES order. */
export const OAK_STAGE_COMPONENTS: readonly ComponentType<OakStageProps>[] = [
  OakSeed,
  OakSprout,
  OakSapling,
  OakYoung,
  OakMighty,
];
