import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function prepare(source, monthOverride) {
  const root = mkdtempSync(join(tmpdir(), 'stock-data-test-'));
  try {
    mkdirSync(join(root, 'scripts'));
    copyFileSync(new URL('../scripts/prepare-data.mjs', import.meta.url), join(root, 'scripts/prepare-data.mjs'));
    copyFileSync(new URL('../scripts/load-data.mjs', import.meta.url), join(root, 'scripts/load-data.mjs'));
    mkdirSync(join(root, 'data/daily'), {recursive:true});
    writeFileSync(join(root, 'data/config.json'), JSON.stringify({returnsEnabled:source.returnsEnabled,returnsStartDate:source.returnsStartDate}));
    writeFileSync(join(root, 'data/cumulative-adjustments.json'), JSON.stringify(source.cumulativeAdjustments ?? []));
    const months = Object.groupBy(source.days, day => day.date.slice(0,7));
    for (const [month, days] of Object.entries(months)) writeFileSync(join(root, `data/daily/${monthOverride ?? month}.json`), JSON.stringify(days));
    const result = spawnSync(process.execPath, [join(root, 'scripts/prepare-data.mjs')], {encoding:'utf8'});
    return {status: result.status, data: result.status === 0 ? JSON.parse(readFileSync(join(root,'public/scoreboard.json'))) : null};
  } finally { rmSync(root, {recursive:true, force:true}); }
}
const source = {returnsEnabled:false, returnsStartDate:null, days:[{date:'2026-09-11',amounts:{lun:{stock:10,fund:2},lei:{stock:-1,fund:0},jian:{stock:null,fund:0},chao:{stock:0,fund:null}}}]};
test('数据流水线保留待结算值并从唯一数据源生成公开文件', () => {
  assert.deepEqual(prepare(source), {status:0, data:{...source,cumulativeAdjustments:[]}});
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

test('数据流水线拒绝旧数字、缺项和无效分项', () => {
  for (const entry of [10, null, {stock: 1}, {stock: '1', fund: 0}, {stock: 0, fund: '待结算'}]) {
    assert.notEqual(prepare({...source, days:[{...source.days[0], amounts:{...source.days[0].amounts, lun:entry}}]}).status, 0);
  }
});


test('跨月文件自动汇总并按日期排序，保留校准记录', () => {
  const days = ['2026-10-02','2026-09-30','2026-10-01'].map(date => ({...source.days[0],date}));
  const cumulativeAdjustments = [{date:'2026-09-30',amounts:{lun:-123.45}}];
  const result = prepare({...source,days,cumulativeAdjustments});
  assert.equal(result.status,0);
  assert.deepEqual(result.data.days.map(day=>day.date),['2026-09-30','2026-10-01','2026-10-02']);
  assert.deepEqual(result.data.cumulativeAdjustments,cumulativeAdjustments);
});
test('拒绝无效校准日期、重复日期、未知成员和非数字金额', () => {
  for (const cumulativeAdjustments of [
    [{date:'2026-02-30',amounts:{lun:0}}],
    [{date:'2026-09-01',amounts:{lun:0}},{date:'2026-09-01',amounts:{lei:1}}],
    [{date:'2026-09-01',amounts:{foo:1}}],
    [{date:'2026-09-01',amounts:{lun:null}}],
    [{date:'2026-09-01',amounts:{}}],
  ]) assert.notEqual(prepare({...source,cumulativeAdjustments}).status,0);
});

test('月文件拒绝错误月份与无效文件名', () => {
  assert.notEqual(prepare(source,'2026-10').status,0);
  assert.notEqual(prepare(source,'2026-13').status,0);
  assert.notEqual(prepare(source,'latest').status,0);
});
