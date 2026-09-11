import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(new URL('../scoreboard.json', import.meta.url), 'utf8'));
if (typeof source.returnsEnabled !== 'boolean' || !Array.isArray(source.days)) throw new Error('Invalid scoreboard settings');
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
if (source.returnsStartDate !== null && !validDate(source.returnsStartDate)) throw new Error('Invalid returnsStartDate');
if (source.returnsEnabled && !source.returnsStartDate) throw new Error('returnsStartDate is required when returns are enabled');
const dates = new Set();
for (const day of source.days) {
  if (!validDate(day.date) || dates.has(day.date)) throw new Error(`Invalid or duplicate date: ${day.date}`);
  dates.add(day.date);
  if (!day.amounts || typeof day.amounts !== 'object' || Array.isArray(day.amounts)) throw new Error(`Missing amounts: ${day.date}`);
  for (const metric of ['amounts', 'returns']) {
    for (const id of ['lun', 'lei', 'jian', 'chao']) {
      const value = day[metric]?.[id];
      if (value != null && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(`Invalid ${metric}: ${day.date}/${id}`);
    }
  }
}
mkdirSync(new URL('../public/', import.meta.url), {recursive:true});
copyFileSync(new URL('../scoreboard.json', import.meta.url), new URL('../public/scoreboard.json', import.meta.url));
console.log(`Validated and copied ${dates.size} daily records`);
