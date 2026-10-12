import type { Project } from '../../data/content';
import { VisualCmdb } from './VisualCmdb';
import { VisualEnterprise } from './VisualEnterprise';
import { VisualHr } from './VisualHr';
import { VisualNlu } from './VisualNlu';

/** Detailed illustrative interface shown in each case study's Implementation section. */
export function CaseVisual({ project }: { project: Project }) {
  const label = `Illustrative interface for ${project.title}, with sample data.`;
  switch (project.visual) {
    case 'ribbon':
      return <VisualEnterprise label={label} />;
    case 'panels':
      return <VisualNlu label={label} />;
    case 'constellation':
      return <VisualCmdb label={label} />;
    case 'journey':
      return <VisualHr label={label} />;
  }
}
