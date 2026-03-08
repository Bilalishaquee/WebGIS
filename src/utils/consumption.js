/**
 * Map marker color by daily consumption (liters).
 * Used for parcel markers; thresholds are illustrative.
 * 500 L = 0.5 m³, 800 L = 0.8 m³, 1100 L = 1.1 m³.
 */
export const CONSUMPTION_THRESHOLDS_L = { low: 500, medium: 800, high: 1100 };

export function getConsumptionLevel(daily) {
  if (daily < 500) return { level: 'Low', color: '#93c5fd', threshold: '< 500 L' };
  if (daily < 800) return { level: 'Medium', color: '#60a5fa', threshold: '500-800' };
  if (daily < 1100) return { level: 'High', color: '#3b82f6', threshold: '800-1100' };
  return { level: 'Critical', color: '#1e40af', threshold: '> 1100 L' };
}
