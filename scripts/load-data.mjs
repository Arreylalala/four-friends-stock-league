import { readFileSync, readdirSync } from 'node:fs';

export function loadData(root = new URL('../', import.meta.url)) {
  const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
  const config = read('data/config.json');
  const adjustments = read('data/cumulative-adjustments.json');
  if (!Array.isArray(adjustments)) throw new Error('校准记录必须为数组');
  const files = readdirSync(new URL('data/daily/', root))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const days = files
    .flatMap((name) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])\.json$/.test(name))
        throw new Error(`Invalid month filename: ${name}`);
      const rows = read(`data/daily/${name}`);
      if (
        !Array.isArray(rows) ||
        rows.some((day) => !day?.date?.startsWith(name.slice(0, 7) + '-'))
      )
        throw new Error(`日期不属于文件月份: ${name}`);
      return rows;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const source = {
    returnsEnabled: config.returnsEnabled,
    returnsStartDate: config.returnsStartDate,
    days,
    cumulativeAdjustments: adjustments,
  };
  if (typeof source.returnsEnabled !== 'boolean' || !Array.isArray(source.days))
    throw new Error('Invalid scoreboard settings');
  const validDate = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (source.returnsStartDate !== null && !validDate(source.returnsStartDate))
    throw new Error('Invalid returnsStartDate');
  if (source.returnsEnabled && !source.returnsStartDate)
    throw new Error('returnsStartDate is required when returns are enabled');
  const dates = new Set();
  for (const day of source.days) {
    if (!validDate(day.date) || dates.has(day.date))
      throw new Error(`Invalid or duplicate date: ${day.date}`);
    dates.add(day.date);
    if (
      !day.amounts ||
      typeof day.amounts !== 'object' ||
      Array.isArray(day.amounts)
    )
      throw new Error(`Missing amounts: ${day.date}`);
    for (const id of ['lun', 'lei', 'jian', 'chao']) {
      const entry = day.amounts[id];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry))
        throw new Error(`Missing stock/fund: ${day.date}/${id}`);
      for (const key of ['stock', 'fund']) {
        const value = entry[key];
        if (
          value !== null &&
          (typeof value !== 'number' || !Number.isFinite(value))
        )
          throw new Error(`Invalid ${key}: ${day.date}/${id}`);
      }
      const value = day.returns?.[id];
      if (
        value != null &&
        (typeof value !== 'number' || !Number.isFinite(value))
      )
        throw new Error(`Invalid returns: ${day.date}/${id}`);
    }
  }

  const calibrationDates = new Set();
  for (const entry of adjustments) {
    if (!entry || !validDate(entry.date) || calibrationDates.has(entry.date))
      throw new Error('Invalid or duplicate calibration date');
    calibrationDates.add(entry.date);
    if (
      !entry.amounts ||
      typeof entry.amounts !== 'object' ||
      Array.isArray(entry.amounts) ||
      !Object.keys(entry.amounts).length
    )
      throw new Error('Missing calibration amounts');
    for (const [id, value] of Object.entries(entry.amounts)) {
      if (
        !['lun', 'lei', 'jian', 'chao'].includes(id) ||
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        !Number.isSafeInteger(Math.round(value * 100))
      )
        throw new Error(`Invalid calibration amount: ${entry.date}/${id}`);
    }
  }
  source.cumulativeAdjustments.sort((a, b) => a.date.localeCompare(b.date));
  return source;
}
