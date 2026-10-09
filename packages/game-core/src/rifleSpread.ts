interface Vector { readonly x: number; readonly y: number; readonly z: number }
/** Uniform solid-angle cone sampling. Random samples are provided by the simulation authority. */
export function spreadDirection(direction: Vector, halfAngle: number, radial: number, azimuth: number): Vector | null {
  if (![direction.x, direction.y, direction.z, halfAngle, radial, azimuth].every(Number.isFinite)
    || halfAngle < 0 || halfAngle > Math.PI / 2 || radial < 0 || radial >= 1 || azimuth < 0 || azimuth >= 1) return null;
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!Number.isFinite(length) || length === 0) return null;
  const x = direction.x / length, y = direction.y / length, z = direction.z / length;
  // Stable tangent basis, including vertical aim.
  const basisLength = Math.abs(y) < 0.9 ? Math.hypot(x, z) : Math.hypot(y, z);
  const u = Math.abs(y) < 0.9 ? { x: -z / basisLength, y: 0, z: x / basisLength }
    : { x: 0, y: z / basisLength, z: -y / basisLength };
  const v = { x: y * u.z - z * u.y, y: z * u.x - x * u.z, z: x * u.y - y * u.x };
  const cosine = 1 - radial * (1 - Math.cos(halfAngle));
  const sine = Math.sqrt(Math.max(0, 1 - cosine * cosine));
  const a = Math.cos(azimuth * 2 * Math.PI) * sine, b = Math.sin(azimuth * 2 * Math.PI) * sine;
  return Object.freeze({ x: x * cosine + u.x * a + v.x * b,
    y: y * cosine + u.y * a + v.y * b, z: z * cosine + u.z * a + v.z * b });
}
