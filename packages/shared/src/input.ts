export interface MovementKeys {
  readonly forward: boolean;
  readonly backward: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly aiming?: boolean;
}
/** View intent in radians; contains no authoritative coordinates. */
export interface CameraHeading { yaw: number }
