export type TrendPoint = {
  date: string;
  value: number;
};

export function buildTrend(points: TrendPoint[]) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return points.map((point) => ({
    ...point,
    percent: Math.round((point.value / max) * 100),
  }));
}
