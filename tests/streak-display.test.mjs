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
const day = (date, winner) => ({ date, amounts: { lun: 0, lei: 0, jian: 0, chao: 0, [winner]: 100 } });
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
