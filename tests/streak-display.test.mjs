import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Load the actual TS/TSX components so regressions in the badge wiring are tested.
const root = new URL('../', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith(root.href))) {
      const base = specifier.startsWith('@/')
        ? new URL(specifier.slice(2), root)
        : new URL(specifier, context.parentURL);
      for (const suffix of ['', '.ts', '.tsx']) {
        const url = new URL(base.href + suffix);
        if (/\.tsx?$/.test(url.pathname) && existsSync(fileURLToPath(url))) {
          return { url: url.href, shortCircuit: true };
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(root.href) && !url.includes('/node_modules/') && /\.tsx?$/.test(url)) {
      return {
        format: 'module', shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
          compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});
const { buildPublicScoreboard } = await import('../lib/static-scoreboard.ts');
const { PublicScoreboard } = await import('../components/public-scoreboard.tsx');
const day = (date, winner) => ({ date, amounts: Object.fromEntries(['lun', 'lei', 'jian', 'chao'].map(id => [id, {stock: id === winner ? 100 : 0, fund: 0}])) });
const source = {
  returnsEnabled: false, returnsStartDate: null,
  days: [day('2026-09-01', 'jian'), day('2026-09-02', 'jian'), day('2026-09-03', 'jian'), day('2026-09-09', 'chao'), day('2026-09-10', 'jian')],
};
const render = (data) => renderToStaticMarkup(React.createElement(PublicScoreboard, {data, onPeriodChange() {}}));

test('排行榜不能将历史三连胜显示为输后再赢的当前连胜', () => {
  const data = buildPublicScoreboard(source);
  assert.equal(data.currentAmountStreaks.jian, 1);
  assert.equal(data.amountRanking[0].longestAmountStreak, 3);
  assert.doesNotMatch(render(data), /aria-label="\d+连胜"/);
});

test('两处徽章都使用当前连胜与新的 2连胜 文案，切换周期保持一致', () => {
  const continued = {...source, days: [...source.days, day('2026-09-11', 'jian')]};
  for (const period of ['week', 'month', 'year', 'all']) {
    const html = render(buildPublicScoreboard(continued, period, '2026-09-11'));
    assert.equal((html.match(/aria-label="2连胜"/g) ?? []).length, 2);
    assert.doesNotMatch(html, /本周期最长连胜|连胜 \d+ 场|3连胜/);
  }
});

test('最新胜者与累计榜首不同时，榜首不保留旧连胜徽章', () => {
  const html = render(buildPublicScoreboard({...source, days: source.days.slice(0, -1)}));
  assert.doesNotMatch(html, /aria-label="\d+连胜"/);
});

test('当前 2–4 连胜保持小火苗，5 连胜及以上在两处升级为大火苗', () => {
  for (const streak of [2, 3, 4, 5, 8]) {
    const days = Array.from({length: streak}, (_, i) => day(`2026-09-${String(i + 1).padStart(2, '0')}`, 'jian'));
    const html = render(buildPublicScoreboard({...source, days}));
    assert.equal((html.match(new RegExp(`aria-label="${streak}连胜"`, 'g')) ?? []).length, 2);
    assert.equal((html.match(/class="streak-fire(?: streak-fire--compact)?"/g) ?? []).length, streak >= 5 ? 2 : 0);
  }
});

test('五连胜中断后不会保留大火苗或历史连胜徽章', () => {
  const days = Array.from({length: 5}, (_, i) => day(`2026-09-0${i + 1}`, 'jian'));
  for (const suffix of [[day('2026-09-06', 'chao')], [day('2026-09-06', 'chao'), day('2026-09-07', 'jian')]]) {
    const html = render(buildPublicScoreboard({...source, days: [...days, ...suffix]}));
    assert.doesNotMatch(html, /streak-fire|aria-label="\d+连胜"/);
  }
});

test('股票基金以分为单位合计，排名、趋势与胜者使用合计', () => {
  const entry = {date:'2026-09-16', amounts:{lun:{stock:100,fund:-30},lei:{stock:60,fund:20},jian:{stock:0.1,fund:0.2},chao:{stock:-10,fund:0}}};
  const data = buildPublicScoreboard({...source, days:[entry]});
  assert.deepEqual(data.latest.results.map(r => r.amountFen), [7000,8000,30,-1000]);
  assert.deepEqual(data.latest.amountWinnerIds, ['lei']);
  assert.equal(data.amountRanking[0].id, 'lei');
  assert.equal(data.amountRanking[0].totalAmountFen, 8000);
  assert.equal(data.trend[0].amounts.lun, 7000);
  assert.equal(data.currentAmountStreaks.lei, 1);
  assert.doesNotMatch(render(data), /stock|fund/);
});

test('任一分项为 null 时该人待结算，全日不计入排名、趋势或连胜', () => {
  for (const key of ['stock', 'fund']) {
    const pending = day('2026-09-16', 'lun');
    pending.amounts.lun[key] = null;
    const data = buildPublicScoreboard({...source, days:[day('2026-09-15', 'jian'), pending]});
    assert.equal(data.latest.settled, false);
    assert.equal(data.latest.results[0].amountFen, null);
    assert.deepEqual(data.latest.amountWinnerIds, []);
    assert.equal(data.publishedDays, 1);
    assert.equal(data.trend.length, 1);
    assert.equal(data.currentAmountStreaks.jian, 1);
    assert.equal(data.amountRanking.find(r => r.id === 'lun').totalAmountFen, 0);
    assert.match(render(data), /待结算/);
  }
});


test('累计盈亏独立校准、跨月累加、周期切换不变且不重复计入当天', () => {
  const days = [day('2026-09-30','lun'),day('2026-10-01','lun'),day('2026-10-02','lei')];
  const cumulativeAdjustments = [{date:'2026-10-01',amounts:{lun:-20.10}},{date:'2026-09-30',amounts:{lun:-100,lei:0}}];
  for (const period of ['week','month','year','all']) {
    const data = buildPublicScoreboard({...source,days,cumulativeAdjustments},period,'2026-09-01');
    assert.deepEqual(data.cumulative.map(item=>item.amountFen),[-2010,10000,null,null]);
    assert.match(render(data), /累计盈亏/);
    assert.match(render(data), /待录入/);
  }
});
test('校准之前更正不影响累计，之后更正会重算，待结算不计入', () => {
  const before = day('2026-09-30','lun'), after = day('2026-10-01','lun'), pending = day('2026-10-02','lei');
  pending.amounts.chao.fund = null;
  const cumulativeAdjustments = [{date:'2026-09-30',amounts:{lun:0}}];
  const calc = () => buildPublicScoreboard({...source,days:[pending,before,after],cumulativeAdjustments}).cumulative[0];
  assert.equal(calc().amountFen,10000);
  before.amounts.lun.stock=900;
  assert.equal(calc().amountFen,10000);
  after.amounts.lun.stock=0.1;after.amounts.lun.fund=0.2;
  assert.equal(calc().amountFen,30);
  assert.equal(calc().pendingDays,1);
  assert.equal(calc().throughDate,'2026-10-01');
});
test('月度拆分汇总后原有全周期统计与跨月连胜不变', () => {
  const days=[day('2026-09-30','lun'),day('2026-10-01','lun')];
  for (const period of ['week','month','year','all']) {
    const a=buildPublicScoreboard({...source,days},period,'2026-10-01');
    const b=buildPublicScoreboard({...source,days:[...days].reverse(),cumulativeAdjustments:[{date:'2026-10-01',amounts:{lun:-500}}]},period,'2026-10-01');
    const {cumulative:ac,...restA}=a;const {cumulative:bc,...restB}=b;
    assert.deepEqual(restA,restB);
    assert.equal(b.currentAmountStreaks.lun,2);
  }
});
