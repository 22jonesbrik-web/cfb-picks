export const CONFIDENCE_POINTS = Array.from({ length: 10 }, (_, index) => index + 1);
export function getHighestUnusedConfidence(values: Array<number | null | undefined>): number | null { const used = new Set(values.filter((value): value is number => Number.isInteger(value))); for (let value = 10; value >= 1; value -= 1) if (!used.has(value)) return value; return null; }
export function validateConfidenceWeights(values: Array<number | null | undefined>): { valid: boolean; message?: string } { const weights = values.filter((value): value is number => Number.isInteger(value)).sort((a, b) => a - b); if (weights.length !== 10 || weights.some((value, index) => value !== index + 1)) return { valid: false, message: 'Select exactly 10 games and assign each confidence value from 1 through 10 once.' }; return { valid: true }; }
export function canAddContestGame(activeGameCount: number): boolean { return activeGameCount < 16; }

