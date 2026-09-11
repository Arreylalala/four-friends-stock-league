export type MemberId = 'lun' | 'lei' | 'jian' | 'chao';
export type SettlementStatus = 'draft' | 'published' | 'voided';

export type Member = {
  id: MemberId;
  nickname: string;
  color: string;
  displayOrder: number;
};

export type RankedMember = Member & {
  rank: number;
  totalAmountFen: number;
  monthlyReturnPpm: number | null;
  amountWins: number;
  returnWins: number;
  longestAmountStreak: number;
  longestReturnStreak: number;
};

export type DailyMemberResult = {
  memberId: MemberId;
  nickname: string;
  color: string;
  amountFen: number | null;
  returnPpm: number | null;
  amountWinner: boolean;
  returnWinner: boolean;
};

export type DailyScore = {
  id: number;
  date: string;
  note: string | null;
  settled: boolean;
  amountWinnerIds: MemberId[];
  returnWinnerIds: MemberId[];
  amountDraw: boolean;
  returnDraw: boolean;
  results: DailyMemberResult[];
};

export type TrendPoint = {
  date: string;
  amounts: Record<MemberId, number>;
  returns: Record<MemberId, number | null>;
};

export type PublicScoreboardData = {
  selectedPeriod: PeriodKind;
  selectedAnchor: string;
  rangeStart: string | null;
  rangeEndExclusive: string | null;
  periodLabel: string;
  members: Member[];
  amountRanking: RankedMember[];
  returnRanking: RankedMember[];
  returnsEnabled: boolean;
  returnsStartDate: string | null;
  publishedDays: number;
  latestPublishedDate: string | null;
  latest: DailyScore | null;
  currentAmountStreaks: Record<MemberId, number>;
  currentReturnStreaks: Record<MemberId, number>;
  days: DailyScore[];
  trend: TrendPoint[];
  isPreview: boolean;
};

export type AdminSettlementRow = {
  id: number;
  date: string;
  status: SettlementStatus;
  note: string | null;
  version: number;
  updatedAt: string;
  results: Record<
    MemberId,
    { amountFen: number | null; returnPpm: number | null }
  >;
};

export type AdminSettings = {
  returnsEnabled: boolean;
  returnsStartDate: string | null;
  adminUserId: string | null;
};
import type { PeriodKind } from '@/lib/period';
