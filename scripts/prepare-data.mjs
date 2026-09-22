import { mkdirSync, writeFileSync } from 'node:fs';
import { loadData } from './load-data.mjs';
const source = loadData();
mkdirSync(new URL('../public/', import.meta.url), {recursive:true});
writeFileSync(new URL('../public/scoreboard.json', import.meta.url), JSON.stringify(source, null, 2) + '\n');
console.log(`Validated and merged ${source.days.length} daily records and ${source.cumulativeAdjustments.length} calibrations`);
