/**
 * Feature flags read from Vite build-time environment variables.
 */

export const featureFlags = {
  /** 3D personality vector space (MIG-012). */
  vector3d: import.meta.env.VITE_FEATURE_VECTOR_3D === 'true',
  /** Cloud sync & auth entry (MIG-015). */
  cloudSync: import.meta.env.VITE_FEATURE_CLOUD_SYNC !== 'false',
} as const;

export type FeatureFlags = typeof featureFlags;
