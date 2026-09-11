import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compoundPpm,
  winnerIdsFromValues,
  winStreakStats,
} from '../lib/scoring.ts';

test('金额最高者胜出', () => {
  assert.deepEqual(
    winnerIdsFromValues([
      { id: '伦', value: 1200 },
      { id: '镭', value: 300 },
      { id: '健', value: -50 },
      { id: '超', value: 800 },
    ]),
    ['伦'],
  );
});

test('全员亏损时亏损最少者胜出', () => {
  assert.deepEqual(
    winnerIdsFromValues([
      { id: '伦', value: -1200 },
      { id: '镭', value: -300 },
      { id: '健', value: -50 },
      { id: '超', value: -800 },
    ]),
    ['健'],
  );
});

test('同额最高时共享胜场', () => {
  assert.deepEqual(
    winnerIdsFromValues([
      { id: '伦', value: 500 },
      { id: '镭', value: 500 },
      { id: '健', value: 100 },
      { id: '超', value: 0 },
    ]),
    ['伦', '镭'],
  );
});

test('收益率按日复利并进行整数 ppm 四舍五入', () => {
  assert.equal(compoundPpm([100_000, -100_000]), -10_000);
  assert.equal(compoundPpm([12_500, 25_000]), 37_813);
});

test('连续获胜统计同时记录当前连胜和最长连胜', () => {
  const result = winStreakStats(
    ['a', 'b'],
    [
      { winnerIds: ['a'] },
      { winnerIds: ['a'] },
      { winnerIds: ['b'] },
      { winnerIds: ['a', 'b'] },
    ],
  );

  assert.deepEqual(result.current, { a: 1, b: 2 });
  assert.deepEqual(result.longest, { a: 2, b: 2 });
});
