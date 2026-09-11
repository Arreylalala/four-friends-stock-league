import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPeriodRange,
  periodLabel,
  shiftPeriodAnchor,
} from '../lib/period.ts';

test('周度范围从周一开始，到下周一结束', () => {
  assert.deepEqual(getPeriodRange('week', '2026-08-31'), {
    start: '2026-08-31',
    endExclusive: '2026-09-07',
  });
});

test('跨月周度标签展示完整范围', () => {
  const range = getPeriodRange('week', '2026-08-31');
  assert.equal(
    periodLabel('week', '2026-08-31', range),
    '2026 年 8 月 31 日–9 月 6 日',
  );
});

test('月度和年度可以前后切换', () => {
  assert.equal(shiftPeriodAnchor('month', '2026-01-15', -1), '2025-12-01');
  assert.equal(shiftPeriodAnchor('year', '2026-08-31', 1), '2027-08-31');
});

test('统计以来没有日期边界', () => {
  assert.deepEqual(getPeriodRange('all', '2026-08-31'), {
    start: null,
    endExclusive: null,
  });
});
