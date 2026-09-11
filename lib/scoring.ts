export function winnerIdsFromValues<T extends string>(
  values: { id: T; value: number }[],
): T[] {
  if (values.length === 0) return [];
  const maximum = Math.max(...values.map((item) => item.value));
  return values.filter((item) => item.value === maximum).map((item) => item.id);
}

export function compoundPpm(values: number[]): number {
  if (values.length === 0) return 0;
  const scale = 1_000_000n;
  let numerator = 1n;
  let denominator = 1n;
  for (const value of values) {
    numerator *= scale + BigInt(value);
    denominator *= scale;
  }
  const scaled = (numerator - denominator) * scale;
  const sign = scaled < 0n ? -1n : 1n;
  const rounded = ((scaled * sign + denominator / 2n) / denominator) * sign;
  return Number(rounded);
}

export type WinStreakStats<T extends string> = {
  current: Record<T, number>;
  longest: Record<T, number>;
};

export function winStreakStats<T extends string>(
  memberIds: T[],
  days: { winnerIds: T[] }[],
): WinStreakStats<T> {
  const current = Object.fromEntries(memberIds.map((id) => [id, 0])) as Record<
    T,
    number
  >;
  const longest = { ...current };

  for (const day of days) {
    const winners = new Set(day.winnerIds);
    for (const id of memberIds) {
      current[id] = winners.has(id) ? current[id] + 1 : 0;
      longest[id] = Math.max(longest[id], current[id]);
    }
  }

  return { current, longest };
}
