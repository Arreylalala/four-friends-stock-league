'use client';

import { useCallback, useEffect, useState } from 'react';
import { PublicScoreboard } from '@/components/public-scoreboard';
import {
  buildPublicScoreboard,
  type EditableScoreboard,
} from '@/lib/static-scoreboard';
import type { PublicScoreboardData } from '@/lib/scoreboard-types';
import type { PeriodKind } from '@/lib/period';

export default function Home() {
  const [data, setData] = useState<PublicScoreboardData | null>(null);
  const [scoreboard, setScoreboard] = useState<EditableScoreboard | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    try {
      const params = new URLSearchParams(window.location.search);
      const dataUrl = new URL('scoreboard.json', window.location.href);
      dataUrl.searchParams.set('v', String(Date.now()));
      fetch(dataUrl, { signal: controller.signal, cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error('LOAD_FAILED');
          return (await response.json()) as EditableScoreboard;
        })
        .then((scoreboard) => {
          setScoreboard(scoreboard);
          setData(
            buildPublicScoreboard(
              scoreboard,
              params.get('period') ?? undefined,
              params.get('anchor') ?? undefined,
            ),
          );
        })
        .catch((reason) => {
          if (reason?.name !== 'AbortError') setError(true);
        });
    } catch {
      setError(true);
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!scoreboard) return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setData(
        buildPublicScoreboard(
          scoreboard,
          params.get('period') ?? undefined,
          params.get('anchor') ?? undefined,
        ),
      );
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scoreboard]);

  const changePeriod = useCallback(
    (period: PeriodKind, anchor: string) => {
      if (!scoreboard) return;
      const url = new URL(window.location.href);
      url.search = new URLSearchParams({ period, anchor }).toString();
      window.history.pushState(null, '', url);
      setData(buildPublicScoreboard(scoreboard, period, anchor));
    },
    [scoreboard],
  );

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="text-xl font-bold">战报暂时没有加载成功</p>
          <button className="mt-4 rounded-full bg-foreground px-5 py-2 text-sm text-background" onClick={() => location.reload()}>
            重新加载
          </button>
        </div>
      </main>
    );
  }
  if (!data) {
    return <main className="min-h-screen animate-pulse bg-background" aria-label="正在加载战报" />;
  }
  return <PublicScoreboard data={data} onPeriodChange={changePeriod} />;
}
