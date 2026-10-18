import { PLAYER_CONFIG } from './player';
const sprintMultiplier=1.35;
export const LOCOMOTION_CONFIG=Object.freeze({sprintMultiplier,weightSpeedPenalty:.1,jumpHeightBoost:.3,jumpReferenceSpeed:PLAYER_CONFIG.speed*sprintMultiplier,sprintFovIncrease:5});
