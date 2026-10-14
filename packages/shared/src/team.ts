export const TEAM_IDS = Object.freeze(['red', 'blue'] as const);
export type TeamId = typeof TEAM_IDS[number];
export function parseTeamId(value: unknown): TeamId {
  if (value !== 'red' && value !== 'blue') throw new TypeError('Invalid team identity'); return value;
}
