import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const out = new URL('../out/', import.meta.url);
const html = readFileSync(new URL('index.html', out), 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]*_next\/[^"]+)"/g)].map(match => match[1]);
assert(assets.length > 0, 'No Next.js assets found');
for (const asset of assets) {
  const prefix = '/four-friends-stock-league/';
  assert(asset.startsWith(prefix), `Incorrect Pages asset path: ${asset}`);
  assert(existsSync(new URL(asset.slice(prefix.length), out)), `Missing asset: ${asset}`);
}
assert.deepEqual(JSON.parse(readFileSync(new URL('scoreboard.json', out))), JSON.parse(readFileSync(new URL('../scoreboard.json', import.meta.url))));
console.log('Static asset paths and exported data verified');
