/** Three still raycasts hidden meshes. Stop recursive queries at pure VFX pools,
 * so flight/burst/trace meshes never occlude overhead HTML or intercept input. */
export const skipEffectRaycast = () => false;
