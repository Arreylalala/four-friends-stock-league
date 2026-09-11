import {
  getPeriodRange,
  normalizeAnchor,
  normalizePeriod,
  periodLabel,
} from './period';
import { compoundPpm, winnerIdsFromValues, winStreakStats } from './scoring';
import type {
  DailyScore,
  Member,
  MemberId,
  PublicScoreboardData,
  RankedMember,
  TrendPoint,
} from './scoreboard-types';

export type EditableDay = {
  date: string;
  note?: string | null;
  amounts: Partial<Record<MemberId, number | null>>;
  returns?: Partial<Record<MemberId, number | null>>;
};

export type EditableScoreboard = {
  returnsEnabled: boolean;
  returnsStartDate: string | null;
  days: EditableDay[];
};

const MEMBERS: Member[] = [
  { id: 'lun', nickname: '伦', color: '#ef5b3d', displayOrder: 1 },
  { id: 'lei', nickname: '镭', color: '#2f80ed', displayOrder: 2 },
  { id: 'jian', nickname: '健', color: '#8b5cf6', displayOrder: 3 },
  { id: 'chao', nickname: '超', color: '#139b73', displayOrder: 4 },
];
const MEMBER_IDS = MEMBERS.map((member) => member.id);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function buildPublicScoreboard(
  source: EditableScoreboard,
  requestedPeriod?: string,
  requestedAnchor?: string,
): PublicScoreboardData {
  const allDays = normalizeDays(source);
  const latestStored = allDays.at(-1) ?? null;
  const selectedPeriod = normalizePeriod(requestedPeriod);
  const selectedAnchor = normalizeAnchor(
    requestedAnchor,
    latestStored?.date ?? shanghaiToday(),
  );
  const range = getPeriodRange(selectedPeriod, selectedAnchor);
  const selected = allDays.filter(
    (day) =>
      !range.start ||
      (day.date >= range.start && day.date < (range.endExclusive as string)),
  );
  const amountTotals = zeroRecord();
  const amountWins = zeroRecord();
  const returnWins = zeroRecord();
  const returnValues: Record<MemberId, number[]> = {
    lun: [],
    lei: [],
    jian: [],
    chao: [],
  };
  const trend: TrendPoint[] = [];

  const selectedAmountStreaks = winStreakStats(
    MEMBER_IDS,
    selected
      .filter((day) => day.settled)
      .map((day) => ({ winnerIds: day.amountWinnerIds })),
  );
  const selectedReturnStreaks = winStreakStats(
    MEMBER_IDS,
    selected
      .filter((day) => day.results.some((result) => result.returnPpm !== null))
      .map((day) => ({ winnerIds: day.returnWinnerIds })),
  );
  const allAmountStreaks = winStreakStats(
    MEMBER_IDS,
    allDays
      .filter((day) => day.settled)
      .map((day) => ({ winnerIds: day.amountWinnerIds })),
  );
  const allReturnStreaks = winStreakStats(
    MEMBER_IDS,
    allDays
      .filter((day) => day.results.some((result) => result.returnPpm !== null))
      .map((day) => ({ winnerIds: day.returnWinnerIds })),
  );

  for (const day of selected) {
    if (!day.settled) continue;
    for (const result of day.results) {
      amountTotals[result.memberId] += result.amountFen as number;
      if (result.amountWinner) amountWins[result.memberId] += 1;
      if (result.returnWinner) returnWins[result.memberId] += 1;
      if (result.returnPpm !== null)
        returnValues[result.memberId].push(result.returnPpm);
    }
    trend.push({
      date: day.date,
      amounts: { ...amountTotals },
      returns: Object.fromEntries(
        MEMBER_IDS.map((id) => [
          id,
          returnValues[id].length ? compoundPpm(returnValues[id]) : null,
        ]),
      ) as Record<MemberId, number | null>,
    });
  }

  const ranked = MEMBERS.map<RankedMember>((member) => ({
    ...member,
    rank: 0,
    totalAmountFen: amountTotals[member.id],
    monthlyReturnPpm: returnValues[member.id].length
      ? compoundPpm(returnValues[member.id])
      : null,
    amountWins: amountWins[member.id],
    returnWins: returnWins[member.id],
    longestAmountStreak: selectedAmountStreaks.longest[member.id],
    longestReturnStreak: selectedReturnStreaks.longest[member.id],
  }));
  const amountRanking = withRanks(
    [...ranked].sort(
      (a, b) =>
        b.totalAmountFen - a.totalAmountFen || a.displayOrder - b.displayOrder,
    ),
    (member) => member.totalAmountFen,
  );
  const returnRanking = withRanks(
    [...ranked].sort((a, b) => {
      if (a.monthlyReturnPpm === null) return 1;
      if (b.monthlyReturnPpm === null) return -1;
      return (
        b.monthlyReturnPpm - a.monthlyReturnPpm ||
        a.displayOrder - b.displayOrder
      );
    }),
    (member) => member.monthlyReturnPpm,
  );

  return {
    selectedPeriod,
    selectedAnchor,
    rangeStart: range.start,
    rangeEndExclusive: range.endExclusive,
    periodLabel: periodLabel(selectedPeriod, selectedAnchor, range),
    members: MEMBERS,
    amountRanking,
    returnRanking,
    returnsEnabled: source.returnsEnabled,
    returnsStartDate: source.returnsStartDate,
    publishedDays: selected.filter((day) => day.settled).length,
    latestPublishedDate: latestStored?.date ?? null,
    latest: latestStored,
    currentAmountStreaks: allAmountStreaks.current,
    currentReturnStreaks: allReturnStreaks.current,
    days: [...selected].reverse(),
    trend,
    isPreview: false,
  };
}

function normalizeDays(source: EditableScoreboard): DailyScore[] {
  if (!Array.isArray(source.days)) throw new Error('days 必须是数组');
  const seenDates = new Set<string>();
  return source.days
    .map((day, index) => {
      if (
        !DATE_PATTERN.test(day.date) ||
        Number.isNaN(Date.parse(`${day.date}T00:00:00Z`))
      ) {
        throw new Error(`第 ${index + 1} 条记录的日期格式不正确`);
      }
      if (seenDates.has(day.date)) throw new Error(`日期 ${day.date} 重复`);
      seenDates.add(day.date);
      const amountValues = MEMBER_IDS.map((id) => ({
        id,
        value: optionalNumber(day.amounts?.[id], `${day.date} 的 ${id} 金额`),
      }));
      const settled = amountValues.every(
        ({ value }) => typeof value === 'number',
      );
      const settledAmountValues = settled
        ? (amountValues as { id: MemberId; value: number }[])
        : [];
      const amountDraw =
        settled && settledAmountValues.every(({ value }) => value === 0);
      const amountWinnerIds =
        settled && !amountDraw ? winnerIdsFromValues(settledAmountValues) : [];
      const returnEligible = Boolean(
        settled &&
        source.returnsEnabled &&
        source.returnsStartDate &&
        day.date >= source.returnsStartDate &&
        MEMBER_IDS.every((id) => typeof day.returns?.[id] === 'number'),
      );
      const returnValues = MEMBER_IDS.map((id) => ({
        id,
        value: returnEligible ? (day.returns?.[id] as number) : 0,
      }));
      const returnDraw =
        returnEligible && returnValues.every(({ value }) => value === 0);
      const returnWinnerIds =
        returnEligible && !returnDraw ? winnerIdsFromValues(returnValues) : [];
      return {
        id: index + 1,
        date: day.date,
        note: day.note ?? null,
        settled,
        amountWinnerIds,
        returnWinnerIds,
        amountDraw,
        returnDraw,
        results: MEMBERS.map((member) => {
          const amount = day.amounts?.[member.id];
          return {
            memberId: member.id,
            nickname: member.nickname,
            color: member.color,
            amountFen:
              typeof amount === 'number' ? Math.round(amount * 100) : null,
            returnPpm: returnEligible
              ? Math.round((day.returns?.[member.id] as number) * 10_000)
              : null,
            amountWinner: amountWinnerIds.includes(member.id),
            returnWinner: returnWinnerIds.includes(member.id),
          };
        }),
      } satisfies DailyScore;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function optionalNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} 必须是数字或 null`);
  }
  return value;
}

function withRanks(
  members: RankedMember[],
  getValue: (member: RankedMember) => number | null,
) {
  let lastValue: number | null | undefined;
  let lastRank = 0;
  return members.map((member, index) => {
    const value = getValue(member);
    if (index === 0 || value !== lastValue) lastRank = index + 1;
    lastValue = value;
    return { ...member, rank: lastRank };
  });
}

function zeroRecord(): Record<MemberId, number> {
  return { lun: 0, lei: 0, jian: 0, chao: 0 };
}

function shanghaiToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
