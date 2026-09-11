import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function prepare(source) {
  const root = mkdtempSync(join(tmpdir(), 'stock-data-test-'));
  try {
    mkdirSync(join(root, 'scripts'));
    copyFileSync(new URL('../scripts/prepare-data.mjs', import.meta.url), join(root, 'scripts/prepare-data.mjs'));
    writeFileSync(join(root, 'scoreboard.json'), JSON.stringify(source));
    const result = spawnSync(process.execPath, [join(root, 'scripts/prepare-data.mjs')], {encoding:'utf8'});
    return {status: result.status, data: result.status === 0 ? JSON.parse(readFileSync(join(root,'public/scoreboard.json'))) : null};
  } finally { rmSync(root, {recursive:true, force:true}); }
}
const source = {returnsEnabled:false, returnsStartDate:null, days:[{date:'2026-09-11',amounts:{lun:10,lei:-1,jian:null}}]};
test('数据流水线保留待结算值并从唯一数据源生成公开文件', () => {
  assert.deepEqual(prepare(source), {status:0, data:source});
});
test('数据流水线拒绝重复日期', () => {
  assert.notEqual(prepare({...source,days:[...source.days,...source.days]}).status,0);
});
test('数据流水线拒绝不存在的日期', () => {
  assert.notEqual(prepare({...source,days:[{...source.days[0],date:'2026-02-30'}]}).status,0);
});
test('数据流水线拒绝用文字填写盈亏金额', () => {
  assert.notEqual(prepare({...source,days:[{...source.days[0],amounts:{lun:'待结算'}}]}).status,0);
});
test('启用收益率时必须提供有效开始日期', () => {
  assert.notEqual(prepare({...source,returnsEnabled:true}).status,0);
});
