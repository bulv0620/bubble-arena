import { PHYSICS_CONFIG, PLAYER_CONFIG } from '@bubble-arena/shared';

/** Fixed-step gravity and jump state; collision feedback supplies actual grounding. */
export class VerticalMovement {
  private velocityY = 0;
  private grounded = false;

  constructor(private readonly settings = { gravity: PHYSICS_CONFIG.gravity[1], jumpSpeed: PLAYER_CONFIG.jumpSpeed }) {
    if (!Number.isFinite(settings.gravity) || settings.gravity >= 0
      || !Number.isFinite(settings.jumpSpeed) || settings.jumpSpeed <= 0) {
      throw new RangeError('Gravity must be finite and negative; jump speed must be finite and positive.');
    }
  }

  getState() { return { velocityY: this.velocityY, grounded: this.grounded }; }

  refreshSupport(supported: boolean) {
    this.grounded = supported && this.velocityY <= 0;
  }

  step(jumpPressed: boolean) {
    const jumped = jumpPressed && this.grounded;
    if (jumped) {
      this.velocityY = this.settings.jumpSpeed;
      this.grounded = false;
    }
    this.velocityY += this.settings.gravity * PHYSICS_CONFIG.timeStep;
    return { y: this.velocityY * PHYSICS_CONFIG.timeStep, jumped };
  }

  resolve(desiredY: number, allowedY: number, grounded: boolean, ceilingContact = false) {
    this.grounded = grounded && desiredY <= 0;
    if (this.grounded || (ceilingContact && desiredY > 0
      && allowedY < desiredY - PLAYER_CONFIG.ceilingDisplacementTolerance)) this.velocityY = 0;
  }
}
