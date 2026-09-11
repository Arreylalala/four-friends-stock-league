'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChartColumn,
  ChartSpline,
  Crown,
  Flame,
  Medal,
  Minus,
  Sparkles,
  Trophy,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  periodOptionName,
  periodPrefix,
  periodTrendName,
  shiftPeriodAnchor,
  type PeriodKind,
} from '@/lib/period';
import { cn } from '@/lib/utils';
import type {
  DailyScore,
  MemberId,
  PublicScoreboardData,
  RankedMember,
} from '@/lib/scoreboard-types';

type ViewId = 'all' | MemberId;

export function PublicScoreboard({
  data,
  onPeriodChange,
}: {
  data: PublicScoreboardData;
  onPeriodChange: (period: PeriodKind, anchor: string) => void;
}) {
  const [view, setView] = useState<ViewId>('all');
  const [trendMetric, setTrendMetric] = useState<'amount' | 'return'>('amount');
  const [latestMetric, setLatestMetric] = useState<'amount' | 'return'>(
    'amount',
  );
  const [chartView, setChartView] = useState<'trend' | 'bar'>('trend');
  const selectedMember = useMemo(
    () =>
      view === 'all'
        ? null
        : (data.members.find((member) => member.id === view) ?? null),
    [data.members, view],
  );
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        data.members.map((member) => [
          member.id,
          { label: member.nickname, color: member.color },
        ]),
      ) satisfies ChartConfig,
    [data.members],
  );
  const trendData = useMemo(
    () =>
      data.trend.map((point) => ({
        date: shortDate(point.date),
        ...Object.fromEntries(
          data.members.map((member) => [
            member.id,
            trendMetric === 'amount'
              ? point.amounts[member.id] / 100
              : point.returns[member.id] === null
                ? null
                : point.returns[member.id]! / 10_000,
          ]),
        ),
      })),
    [data.members, data.trend, trendMetric],
  );
  const hasTrendData = useMemo(
    () =>
      trendMetric === 'amount'
        ? data.trend.length > 0
        : data.trend.some((point) =>
            data.members.some((member) => point.returns[member.id] !== null),
          ),
    [data.members, data.trend, trendMetric],
  );
  const dailyBarData = useMemo(() => {
    if (!selectedMember) return [];
    return [...data.days].reverse().map((day) => {
      const result = day.results.find(
        (item) => item.memberId === selectedMember.id,
      );
      const value =
        trendMetric === 'amount'
          ? result?.amountFen === null || result?.amountFen === undefined
            ? null
            : result.amountFen / 100
          : result?.returnPpm === null || result?.returnPpm === undefined
            ? null
            : result.returnPpm / 10_000;
      return {
        date: shortDate(day.date),
        value,
        positiveValue: value !== null && value >= 0 ? value : null,
        negativeValue: value !== null && value < 0 ? value : null,
      };
    });
  }, [data.days, selectedMember, trendMetric]);
  const hasVisibleChartData =
    selectedMember && chartView === 'bar'
      ? dailyBarData.some((point) => point.value !== null)
      : hasTrendData;
  const previousAnchor = shiftPeriodAnchor(
    data.selectedPeriod,
    data.selectedAnchor,
    -1,
  );
  const nextAnchor = shiftPeriodAnchor(
    data.selectedPeriod,
    data.selectedAnchor,
    1,
  );
  const scopePrefix = periodPrefix(data.selectedPeriod);
  const trendName = periodTrendName(data.selectedPeriod);
  const latest = data.latest;
  const latestRanked = latest
    ? [...latest.results].sort((a, b) => {
        if (latestMetric === 'amount') {
          if (a.amountFen === null && b.amountFen === null) {
            return (
              memberOrder(data, a.memberId) - memberOrder(data, b.memberId)
            );
          }
          if (a.amountFen === null) return 1;
          if (b.amountFen === null) return -1;
          return (
            b.amountFen - a.amountFen ||
            memberOrder(data, a.memberId) - memberOrder(data, b.memberId)
          );
        }
        if (a.returnPpm === null && b.returnPpm === null) {
          return memberOrder(data, a.memberId) - memberOrder(data, b.memberId);
        }
        if (a.returnPpm === null) return 1;
        if (b.returnPpm === null) return -1;
        return (
          b.returnPpm - a.returnPpm ||
          memberOrder(data, a.memberId) - memberOrder(data, b.memberId)
        );
      })
    : [];
  const latestWinnerIds = latest
    ? latestMetric === 'amount'
      ? latest.amountWinnerIds
      : latest.returnWinnerIds
    : [];
  const latestDraw = latest
    ? latestMetric === 'amount'
      ? latest.amountDraw
      : latest.returnDraw
    : false;
  const latestHasMetricData = Boolean(
    latest &&
    ((latestMetric === 'amount' && latest.settled) ||
      latest.results.some((result) => result.returnPpm !== null)),
  );
  const latestPending = Boolean(latest && !latest.settled);
  const latestWinnerNames = latest
    ? latestWinnerIds.map(
        (id) =>
          latest.results.find((result) => result.memberId === id)?.nickname ??
          id,
      )
    : [];
  const latestWinningValue =
    !latestHasMetricData || latestDraw
      ? 0
      : latestMetric === 'amount'
        ? (latestRanked[0]?.amountFen ?? 0)
        : (latestRanked[0]?.returnPpm ?? 0);
  const latestStreak =
    latestHasMetricData && !latestDraw && latestWinnerIds.length === 1
      ? latestMetric === 'amount'
        ? data.currentAmountStreaks[latestWinnerIds[0]]
        : data.currentReturnStreaks[latestWinnerIds[0]]
      : 0;
  const selectedRank = selectedMember
    ? data.amountRanking.find((member) => member.id === selectedMember.id)
    : null;

  return (
    <main className="min-h-screen overflow-hidden pb-16">
      <div className="paper-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] opacity-55 [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <header className="border-b border-foreground/8 bg-background/88 backdrop-blur-lg">
        <div className="page-shell flex h-16 items-center justify-between">
          <a
            href="#top"
            className="flex items-center gap-2.5"
            aria-label="华尔街之狼首页"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-[0_6px_18px_rgb(40_32_22/16%)]">
              <Trophy className="size-4.5" />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-[0.16em]">
                华尔街之狼
              </span>
              <span className="block text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Stock League
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2">
            {data.latestPublishedDate ? (
              <Badge
                variant="outline"
                className="hidden h-7 border-foreground/10 bg-card/70 px-2.5 font-normal text-muted-foreground sm:flex"
              >
                <span className="mr-1 size-1.5 rounded-full bg-[#139b73]" />
                已更新至 {shortChineseDate(data.latestPublishedDate)}
              </Badge>
            ) : null}
            {data.isPreview ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                本地预览数据
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <div id="top" className="page-shell pt-8 sm:pt-12">
        <section className="mb-7">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-px w-7 bg-primary" />
              朋友间的每日投资战报
            </div>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">
              看看谁是华尔街之狼
            </h1>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]">
          <Card className="relative min-h-[270px] justify-between overflow-hidden border-0 bg-[#211f1b] text-white ring-0 shadow-[0_24px_60px_rgb(42_33_23/17%)]">
            <div className="absolute -right-14 -top-20 size-72 rounded-full border-[42px] border-white/5" />
            <div className="absolute bottom-0 right-6 text-[190px] font-black leading-[0.72] text-white/[0.035]">
              1
            </div>
            <CardContent className="relative flex h-full flex-col justify-between px-6 py-2 sm:px-8">
              {latest ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <Badge className="h-8 min-h-8 bg-white/10 px-3 text-white hover:bg-white/10">
                      <Sparkles className="mr-1 size-3.5 text-[#f5b942]" />
                      最新战报 · {shortChineseDate(latest.date)}
                    </Badge>
                    <fieldset
                      className="flex h-8 w-20 items-center rounded-lg border-0 bg-white/10 p-0.5"
                      aria-label="今日胜者指标"
                    >
                      <button
                        type="button"
                        aria-label="按金额查看今日胜者"
                        aria-pressed={latestMetric === 'amount'}
                        onClick={() => setLatestMetric('amount')}
                        className={cn(
                          'flex h-7 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors',
                          latestMetric === 'amount'
                            ? 'bg-[#ef5b3d] text-white shadow-sm'
                            : 'text-white/50 hover:text-white',
                        )}
                      >
                        ¥
                      </button>
                      <button
                        type="button"
                        aria-label="按收益率查看今日胜者"
                        aria-pressed={latestMetric === 'return'}
                        onClick={() => setLatestMetric('return')}
                        className={cn(
                          'flex h-7 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors',
                          latestMetric === 'return'
                            ? 'bg-[#ef5b3d] text-white shadow-sm'
                            : 'text-white/50 hover:text-white',
                        )}
                      >
                        %
                      </button>
                    </fieldset>
                  </div>
                  <div className="relative py-8 sm:pr-56">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#ef5b3d] text-2xl font-bold shadow-[0_8px_26px_rgb(239_91_61/38%)]">
                        {latestPending
                          ? '待'
                          : !latestHasMetricData
                            ? '—'
                            : latestDraw
                              ? '平'
                              : latestWinnerNames[0]}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 text-sm text-white/55">
                          <Crown className="size-3.5 text-[#f5b942]" />
                          {latestPending
                            ? '本日进度'
                            : !latestHasMetricData
                              ? '今日结果'
                              : latestDraw
                                ? '今日结果'
                                : latestWinnerNames.length > 1
                                  ? '并列胜者'
                                  : '今日胜者'}
                        </div>
                        <div className="mt-0.5 text-xl font-semibold">
                          {latestPending
                            ? '今日战报待结算'
                            : latestHasMetricData
                              ? latestHeadline(latestDraw, latestWinnerNames)
                              : '暂无收益率数据'}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'metric-number text-4xl font-bold tracking-[-0.055em] sm:text-6xl',
                        latestWinningValue > 0
                          ? 'text-[#ff7962]'
                          : latestWinningValue < 0
                            ? 'text-[#4fd1a5]'
                            : 'text-white',
                      )}
                    >
                      {latestPending
                        ? '—'
                        : !latestHasMetricData
                          ? '—'
                          : latestMetric === 'amount'
                            ? moneyFen(latestWinningValue)
                            : percentPpm(latestWinningValue)}
                    </div>
                    {latestStreak > 0 ? (
                      <StreakBadge
                        streak={latestStreak}
                        tone="dark"
                        className="mt-5 sm:absolute sm:bottom-8 sm:right-0 sm:mt-0"
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="flex min-h-[238px] flex-col items-start justify-center">
                  <Badge className="mb-5 bg-white/10 text-white hover:bg-white/10">
                    等待首份战报
                  </Badge>
                  <h2 className="text-3xl font-bold tracking-tight">
                    还没有已发布的数据
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/55">
                    在数据文件中加入四人的当日盈亏后，最新胜者会出现在这里。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-[#eee6d5] ring-0 shadow-[0_14px_40px_rgb(70_52_28/9%)]">
            <CardContent className="flex h-full min-h-[270px] flex-col justify-between px-6 py-2">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold">最新全员表现</span>
                  <Medal className="size-4 text-[#a36a12]" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestMetric === 'amount'
                    ? latestPending
                      ? '按已提供的当日盈亏金额排序'
                      : '按当日盈亏金额排序'
                    : '按当日收益率排序'}
                </p>
              </div>
              {latest ? (
                <div className="my-5 space-y-2.5">
                  {latestRanked.map((result, index) => (
                    <div
                      key={result.memberId}
                      className="flex items-center gap-3 rounded-xl bg-white/60 px-3 py-2.5"
                    >
                      <span className="w-4 text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <span
                        className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: result.color }}
                      >
                        {result.nickname}
                      </span>
                      <span className="flex-1 text-sm font-medium">
                        {result.nickname}
                      </span>
                      {latestMetric === 'amount' ? (
                        <Value valueFen={result.amountFen} />
                      ) : (
                        <ReturnValue valuePpm={result.returnPpm} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="my-5 rounded-2xl border border-dashed border-foreground/15 px-5 py-10 text-center text-sm text-muted-foreground">
                  尚无可展示数据
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-5">
          <div className="grid w-full grid-cols-[32px_1fr_32px] items-center gap-1 rounded-xl border border-foreground/10 bg-card p-1 shadow-sm">
            {data.selectedPeriod === 'all' ? (
              <span className="inline-flex size-8 items-center justify-center text-muted-foreground/35">
                <ArrowLeft className="size-4" />
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() =>
                  onPeriodChange(data.selectedPeriod, previousAnchor)
                }
                aria-label={`上一个${periodOptionName(data.selectedPeriod)}`}
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <Select
              value={data.selectedPeriod}
              onValueChange={(value) =>
                onPeriodChange(value as PeriodKind, data.selectedAnchor)
              }
            >
              <SelectTrigger
                aria-label="切换统计周期"
                className="h-8 w-full justify-center border-0 bg-transparent px-2 text-sm font-semibold shadow-none hover:bg-secondary"
              >
                <SelectValue className="flex-none text-center">
                  {data.periodLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent
                align="center"
                alignItemWithTrigger={false}
                className="min-w-44 rounded-xl bg-card p-1.5 shadow-[0_14px_38px_rgb(60_47_29/16%)] ring-foreground/10"
              >
                {(['month', 'week', 'year', 'all'] as PeriodKind[]).map(
                  (period) => (
                    <SelectItem
                      key={period}
                      value={period}
                      className="h-9 rounded-lg px-8"
                    >
                      <span className="flex flex-1 justify-center text-center">
                        {periodOptionName(period)}
                      </span>
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {data.selectedPeriod === 'all' ? (
              <span className="inline-flex size-8 items-center justify-center text-muted-foreground/35">
                <ArrowRight className="size-4" />
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => onPeriodChange(data.selectedPeriod, nextAnchor)}
                aria-label={`下一个${periodOptionName(data.selectedPeriod)}`}
              >
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </section>

        <section className="mt-8">
          <RankingCard
            title={`${scopePrefix}金额榜`}
            eyebrow="Amount Ranking"
            members={data.amountRanking}
            currentStreaks={data.currentAmountStreaks}
            metric="amount"
            publishedDays={data.publishedDays}
          />
        </section>

        <section className="mt-8">
          <div className="mb-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">
                {periodEyebrow(data.selectedPeriod, trendMetric)}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {trendName}盈亏走势
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedMember && chartView === 'bar'
                  ? trendMetric === 'amount'
                    ? '按交易日展示个人每日盈亏金额。'
                    : '按交易日展示个人每日收益率。'
                  : trendMetric === 'amount'
                    ? '累计金额走势，视角也会同步到下方每日战报。'
                    : '按每日收益率复利计算本月累计走势。'}
              </p>
            </div>
            <div className="flex flex-nowrap items-center justify-start gap-1">
              <Select
                value={view}
                onValueChange={(value) => setView(value as ViewId)}
              >
                <SelectTrigger
                  aria-label="切换查看视角"
                  className="h-10 min-h-10 w-28 rounded-xl border-foreground/10 bg-secondary/70 px-1.5 shadow-sm hover:bg-secondary"
                >
                  <SelectValue className="gap-1.5">
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{
                        backgroundColor:
                          view === 'all'
                            ? '#211f1b'
                            : (selectedMember?.color ?? '#211f1b'),
                      }}
                    >
                      {view === 'all'
                        ? '全'
                        : (selectedMember?.nickname ?? '全')}
                    </span>
                    <span className="truncate text-sm">
                      {view === 'all'
                        ? '全部视角'
                        : (selectedMember?.nickname ?? '全部视角')}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignItemWithTrigger={false}
                  className="min-w-36 rounded-xl bg-card p-1.5 shadow-[0_14px_38px_rgb(60_47_29/16%)] ring-foreground/10"
                >
                  <SelectItem value="all" className="h-9 rounded-lg px-2.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                      全
                    </span>
                    全部视角
                  </SelectItem>
                  {data.members.map((member) => (
                    <SelectItem
                      key={member.id}
                      value={member.id}
                      className="h-9 rounded-lg px-2.5"
                    >
                      <span
                        className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: member.color }}
                      >
                        {member.nickname}
                      </span>
                      {member.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div
                className="flex h-10 w-20 shrink-0 items-center justify-around gap-0.5 rounded-xl border border-foreground/10 bg-secondary/70 p-1 shadow-sm"
                aria-label="走势指标"
              >
                <Button
                  variant={trendMetric === 'amount' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTrendMetric('amount')}
                  className="size-8 rounded-lg px-0 text-base"
                  aria-label="查看金额走势"
                >
                  ¥
                </Button>
                <Button
                  variant={trendMetric === 'return' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTrendMetric('return')}
                  className="size-8 rounded-lg px-0 text-sm"
                  aria-label="查看收益率走势"
                  title="收益率走势"
                >
                  %
                </Button>
              </div>
              {selectedMember ? (
                <div
                  className="flex h-10 w-20 shrink-0 items-center justify-around gap-0.5 rounded-xl border border-foreground/10 bg-secondary/70 p-1 shadow-sm"
                  aria-label="图表类型"
                >
                  <Button
                    variant={chartView === 'trend' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartView('trend')}
                    className="size-8 rounded-lg px-0"
                    aria-label="查看趋势图"
                    title="趋势图"
                  >
                    <ChartSpline className="size-4" />
                  </Button>
                  <Button
                    variant={chartView === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartView('bar')}
                    className="size-8 rounded-lg px-0"
                    aria-label="查看柱状图"
                    title="柱状图"
                  >
                    <ChartColumn className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <Card className="border-0 shadow-[0_12px_42px_rgb(60_47_29/7%)] ring-foreground/8">
            <CardContent className="px-3 py-2 sm:px-6">
              <div className="mb-2 flex min-h-12 items-center justify-between px-2">
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(selectedMember ? [selectedMember] : data.members).map(
                    (member) => (
                      <span
                        key={member.id}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        {member.nickname}
                      </span>
                    ),
                  )}
                </div>
                {selectedRank ? (
                  trendMetric === 'amount' ? (
                    <Value valueFen={selectedRank.totalAmountFen} />
                  ) : (
                    <ReturnValue valuePpm={selectedRank.monthlyReturnPpm} />
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {trendMetric === 'amount'
                      ? '累计金额（元）'
                      : '累计收益率（%）'}
                  </span>
                )}
              </div>
              {hasVisibleChartData ? (
                <ChartContainer
                  config={chartConfig}
                  className="h-[310px] w-full aspect-auto"
                  initialDimension={{ width: 800, height: 310 }}
                  role="img"
                  aria-label={`${trendName}盈亏${selectedMember && chartView === 'bar' ? '柱状图' : '走势图'}`}
                >
                  {selectedMember && chartView === 'bar' ? (
                    <BarChart
                      accessibilityLayer={false}
                      data={dailyBarData}
                      margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        domain={[
                          (minimum: number) => Math.min(0, minimum),
                          (maximum: number) => Math.max(0, maximum),
                        ]}
                        tickFormatter={
                          trendMetric === 'amount' ? axisMoney : axisPercent
                        }
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#7c756b"
                        strokeOpacity={0.55}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      <Bar
                        dataKey="positiveValue"
                        name={selectedMember.nickname}
                        stackId="daily"
                        fill="#ef5b3d"
                        maxBarSize={34}
                        radius={[5, 5, 5, 5]}
                      />
                      <Bar
                        dataKey="negativeValue"
                        name={selectedMember.nickname}
                        stackId="daily"
                        fill="#139b73"
                        maxBarSize={34}
                        radius={[5, 5, 5, 5]}
                      />
                    </BarChart>
                  ) : selectedMember ? (
                    <AreaChart
                      accessibilityLayer={false}
                      data={trendData}
                      margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="member-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={selectedMember.color}
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor={selectedMember.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={
                          trendMetric === 'amount' ? axisMoney : axisPercent
                        }
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#7c756b"
                        strokeOpacity={0.35}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      <Area
                        type="monotone"
                        dataKey={selectedMember.id}
                        stroke={selectedMember.color}
                        strokeWidth={3}
                        fill="url(#member-fill)"
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart
                      accessibilityLayer={false}
                      data={trendData}
                      margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 5" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={
                          trendMetric === 'amount' ? axisMoney : axisPercent
                        }
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#7c756b"
                        strokeOpacity={0.35}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      {data.members.map((member) => (
                        <Line
                          key={member.id}
                          type="monotone"
                          dataKey={member.id}
                          stroke={member.color}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  )}
                </ChartContainer>
              ) : (
                <div className="flex h-[310px] items-center justify-center text-sm text-muted-foreground">
                  {trendMetric === 'return'
                    ? '这个月还没有可展示的收益率数据'
                    : '这个月还没有已发布的走势数据'}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">
                Daily Records
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                每日战报
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {view === 'all'
                ? '四人视角'
                : `${selectedMember?.nickname}的单人视角`}
            </span>
          </div>
          {data.days.length ? (
            <div className="space-y-3">
              {data.days.map((day) => (
                <DailyRecord key={day.id} day={day} view={view} />
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm ring-foreground/8">
              <CardContent className="flex min-h-44 flex-col items-center justify-center text-center">
                <CalendarDays className="mb-3 size-6 text-muted-foreground" />
                <h3 className="font-semibold">本月暂无公开记录</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  可以切换时间范围，或等待下一份战报。
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      <footer className="page-shell mt-12 flex flex-col justify-between gap-3 border-t border-foreground/10 pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
        <span>数据每日手动更新，仅供朋友间交流</span>
        <span>金额单位：人民币 · 时区：北京时间</span>
      </footer>
    </main>
  );
}

function RankingCard({
  title,
  eyebrow,
  members,
  currentStreaks,
  metric,
  publishedDays,
}: {
  title: string;
  eyebrow: string;
  members: RankedMember[];
  currentStreaks: Record<MemberId, number>;
  metric: 'amount' | 'return';
  publishedDays: number;
}) {
  return (
    <Card className="border-0 shadow-[0_10px_34px_rgb(60_47_29/7%)] ring-foreground/8">
      <CardContent className="px-5 py-1 sm:px-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">
              {eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">{title}</h2>
          </div>
          <Badge variant="secondary">已结算 {publishedDays} 天</Badge>
        </div>
        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/65"
            >
              <RankMark rank={member.rank} />
              <div className="flex items-center gap-3">
                <span
                  className="flex size-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: member.color }}
                >
                  {member.nickname}
                </span>
                <div>
                  <div className="font-semibold">{member.nickname}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {metric === 'amount'
                        ? member.amountWins
                        : member.returnWins}{' '}
                      次日胜
                    </span>
                    {member.rank === 1 ? (
                      <StreakBadge
                        streak={currentStreaks[member.id]}
                        tone="light"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
              {metric === 'amount' ? (
                <Value valueFen={member.totalAmountFen} />
              ) : (
                <ReturnValue valuePpm={member.monthlyReturnPpm} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StreakBadge({
  streak,
  tone,
  className,
}: {
  streak: number;
  tone: 'dark' | 'light';
  className?: string;
}) {
  if (streak < 2) return null;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full font-semibold tabular-nums',
        tone === 'dark'
          ? 'h-10 gap-2 border border-[#c99d49]/75 bg-[#3a342a]/75 px-4 text-sm text-[#f8dfa2] shadow-[0_8px_22px_rgb(0_0_0/18%)] backdrop-blur-sm'
          : 'h-6 gap-1 border border-[#e9c775]/70 bg-[#fff3cf] px-2 text-[11px] text-[#9b680d]',
        className,
      )}
      aria-label={`${streak}连胜`}
      title="当前连胜"
    >
      <Flame
        className={tone === 'dark' ? 'size-4' : 'size-3'}
        fill="currentColor"
      />
      {streak}连胜
    </span>
  );
}

function DailyRecord({ day, view }: { day: DailyScore; view: ViewId }) {
  const visibleResults =
    view === 'all'
      ? day.results
      : day.results.filter((result) => result.memberId === view);
  return (
    <Card className="border-0 py-0 shadow-[0_6px_22px_rgb(60_47_29/5%)] ring-foreground/8">
      <CardContent
        className={cn(
          'grid items-center gap-4 px-4 py-4 sm:px-5',
          view === 'all'
            ? 'sm:grid-cols-[150px_1fr]'
            : 'sm:grid-cols-[180px_1fr]',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <div className="text-sm font-semibold">
              {shortChineseDate(day.date)}
            </div>
            <div className="text-xs text-muted-foreground">
              {weekday(day.date)}
            </div>
          </div>
        </div>
        <div
          className={cn(
            'grid gap-2',
            view === 'all' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1',
          )}
        >
          {visibleResults.map((result) => (
            <div
              key={result.memberId}
              className="relative flex items-center justify-between rounded-lg bg-secondary/45 px-2.5 py-2"
            >
              {day.settled && result.amountWinner && !day.amountDraw ? (
                <span
                  className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#f5b942] text-[#6d4507] shadow-sm ring-2 ring-card"
                  title="当日胜者"
                >
                  <Crown className="size-3 -rotate-45" />
                  <span className="sr-only">当日胜者</span>
                </span>
              ) : null}
              <span
                className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: result.color }}
              >
                {result.nickname}
              </span>
              <span
                className={cn(
                  'metric-number text-sm font-semibold',
                  result.amountFen === null
                    ? 'text-muted-foreground'
                    : result.amountFen > 0
                      ? 'profit'
                      : result.amountFen < 0
                        ? 'loss'
                        : 'text-muted-foreground',
                )}
              >
                {result.amountFen === null
                  ? '待结算'
                  : moneyFen(result.amountFen)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Value({ valueFen }: { valueFen: number | null }) {
  if (valueFen === null)
    return (
      <span className="text-sm font-medium text-muted-foreground">待结算</span>
    );
  const Icon =
    valueFen > 0 ? ArrowUpRight : valueFen < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'metric-number inline-flex items-center text-base font-semibold',
        valueFen > 0
          ? 'profit'
          : valueFen < 0
            ? 'loss'
            : 'text-muted-foreground',
      )}
    >
      <Icon className="mr-0.5 size-3.5" />
      {moneyFen(valueFen)}
    </span>
  );
}

function ReturnValue({ valuePpm }: { valuePpm: number | null }) {
  if (valuePpm === null)
    return <span className="text-sm text-muted-foreground">暂无数据</span>;
  const Icon =
    valuePpm > 0 ? ArrowUpRight : valuePpm < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'metric-number inline-flex items-center text-base font-semibold',
        valuePpm > 0
          ? 'profit'
          : valuePpm < 0
            ? 'loss'
            : 'text-muted-foreground',
      )}
    >
      <Icon className="mr-0.5 size-3.5" />
      {percentPpm(valuePpm)}
    </span>
  );
}

function RankMark({ rank }: { rank: number }) {
  return rank === 1 ? (
    <span className="flex size-8 items-center justify-center rounded-full bg-[#f5b942] text-[#5d3b00] shadow-sm">
      <Crown className="size-4" />
    </span>
  ) : (
    <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

function moneyFen(valueFen: number): string {
  const sign = valueFen > 0 ? '+' : valueFen < 0 ? '-' : '';
  const yuan = Math.abs(valueFen) / 100;
  const amount = yuan.toLocaleString('zh-CN', {
    minimumFractionDigits: valueFen % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sign ? `${sign} ` : ''}¥ ${amount}`;
}

function percentPpm(valuePpm: number): string {
  const sign = valuePpm > 0 ? '+' : '';
  return `${sign}${(valuePpm / 10_000).toLocaleString('zh-CN', { maximumFractionDigits: 4 })}%`;
}

function latestHeadline(draw: boolean, names: string[]): string {
  if (draw) return '四人持平，今日无胜者';
  return names.length > 1
    ? `${names.join('、')}并列胜出`
    : `${names[0]}，今日领先`;
}

function shortChineseDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${month}月${day}日`;
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function weekday(date: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
    timeZone: 'Asia/Shanghai',
  }).format(new Date(`${date}T12:00:00+08:00`));
}

function memberOrder(data: PublicScoreboardData, memberId: MemberId): number {
  return (
    data.members.find((member) => member.id === memberId)?.displayOrder ?? 99
  );
}

function axisMoney(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 10000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString('zh-CN');
}

function axisPercent(value: number): string {
  return `${value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`;
}

function periodEyebrow(
  period: PeriodKind,
  metric: 'amount' | 'return',
): string {
  const scope = {
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
    all: 'All-time',
  }[period];

  return `${scope} ${metric === 'amount' ? 'Trend' : 'Return'}`;
}
