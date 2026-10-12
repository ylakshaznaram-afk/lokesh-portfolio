import type { CaseStudy } from '../../data/content';
import { VisualCmdb } from './VisualCmdb';
import { VisualEnterprise } from './VisualEnterprise';
import { VisualHr } from './VisualHr';
import { VisualNlu } from './VisualNlu';

export function CaseVisual({ study }: { study: CaseStudy }) {
  switch (study.visual) {
    case 'enterprise':
      return <VisualEnterprise label={study.visualAlt} />;
    case 'nlu':
      return <VisualNlu label={study.visualAlt} />;
    case 'cmdb':
      return <VisualCmdb label={study.visualAlt} />;
    case 'hr':
      return <VisualHr label={study.visualAlt} />;
  }
}

export const ILLUSTRATIVE = 'Illustrative interface — not a production screenshot.';
