import { PHYSICS_CONFIG, PLAYER_CONFIG, LOCOMOTION_CONFIG } from '@bubble-arena/shared';

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
  reset() { this.velocityY = 0; this.grounded = false; }

  refreshSupport(supported: boolean) {
    this.grounded = supported && this.velocityY <= 0;
  }

  step(jumpPressed: boolean, groundSpeed = 0) {
    if(!Number.isFinite(groundSpeed)||groundSpeed<0)throw new RangeError('Invalid jump ground speed');
    const jumped = jumpPressed && this.grounded;
    if (jumped) {
      this.velocityY = this.settings.jumpSpeed * Math.sqrt(1+LOCOMOTION_CONFIG.jumpHeightBoost*Math.min(1,groundSpeed/LOCOMOTION_CONFIG.jumpReferenceSpeed));
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
