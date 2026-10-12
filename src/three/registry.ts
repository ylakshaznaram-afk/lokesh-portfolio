import type { SceneKey, SceneModule } from './types';

/** Lazy loaders: each sculpture ships as its own chunk. */
export const sceneLoaders: Record<SceneKey, () => Promise<SceneModule>> = {
  prism: () => import('./prism'),
  ribbon: () => import('./ribbon'),
  constellation: () => import('./constellation'),
};
