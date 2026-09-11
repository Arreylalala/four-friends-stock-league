export type PeriodKind = 'week' | 'month' | 'year' | 'all';

export type PeriodRange = {
  start: string | null;
  endExclusive: string | null;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePeriod(value?: string): PeriodKind {
  return value === 'week' ||
    value === 'year' ||
    value === 'all' ||
    value === 'month'
    ? value
    : 'month';
}

export function normalizeAnchor(value: string | undefined, fallback: string) {
  return value && isValidDate(value) ? value : fallback;
}

export function getPeriodRange(
  period: PeriodKind,
  anchor: string,
): PeriodRange {
  if (period === 'all') return { start: null, endExclusive: null };
  const [year, month] = anchor.split('-').map(Number);
  if (period === 'year') {
    return {
      start: `${year}-01-01`,
      endExclusive: `${year + 1}-01-01`,
    };
  }
  if (period === 'month') {
    return {
      start: `${year}-${pad(month)}-01`,
      endExclusive: addUtcMonths(`${year}-${pad(month)}-01`, 1),
    };
  }
  const date = parseDate(anchor);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  const start = formatDate(date);
  date.setUTCDate(date.getUTCDate() + 7);
  return { start, endExclusive: formatDate(date) };
}

export function shiftPeriodAnchor(
  period: PeriodKind,
  anchor: string,
  delta: number,
): string {
  if (period === 'all') return anchor;
  if (period === 'week') return addUtcDays(anchor, delta * 7);
  if (period === 'month') return addUtcMonths(anchor, delta);
  const date = parseDate(anchor);
  date.setUTCFullYear(date.getUTCFullYear() + delta);
  return formatDate(date);
}

export function periodLabel(
  period: PeriodKind,
  anchor: string,
  range: PeriodRange,
): string {
  const [year, month] = anchor.split('-').map(Number);
  if (period === 'all') return '统计以来';
  if (period === 'year') return `${year} 年`;
  if (period === 'month') return `${year} 年 ${month} 月`;
  const start = range.start as string;
  const end = addUtcDays(range.endExclusive as string, -1);
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  return startYear === endYear
    ? `${startYear} 年 ${startMonth} 月 ${startDay} 日–${endMonth} 月 ${endDay} 日`
    : `${startYear} 年 ${startMonth} 月 ${startDay} 日–${endYear} 年 ${endMonth} 月 ${endDay} 日`;
}

export function periodPrefix(period: PeriodKind): string {
  return period === 'week'
    ? '本周'
    : period === 'year'
      ? '本年'
      : period === 'all'
        ? '统计以来'
        : '本月';
}

export function periodTrendName(period: PeriodKind): string {
  return period === 'week'
    ? '周度'
    : period === 'year'
      ? '年度'
      : period === 'all'
        ? '统计以来'
        : '月度';
}

export function periodOptionName(period: PeriodKind): string {
  return period === 'week'
    ? '周度'
    : period === 'year'
      ? '年度'
      : period === 'all'
        ? '统计以来'
        : '月度';
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = parseDate(value);
  return formatDate(parsed) === value;
}

function addUtcDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function addUtcMonths(value: string, months: number): string {
  const date = parseDate(value);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatDate(date);
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
