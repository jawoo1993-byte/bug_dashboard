// ── Issue 타입 ────────────────────────────────────────────────────
export type IssueStatus = '진행 중' | '해야 할 일' | 'Done (Test)' | 'BLOCK' | string;
export type IssuePriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest' | string;

export interface Issue {
  key: string;
  summary: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee: string;
  reporter: string;
  created: string; // 'YYYY-MM'
  epic: string | null;
}

// ── API 응답 타입 ─────────────────────────────────────────────────
export interface BugsResponse {
  total: number;
  issues: Issue[];
}

export type EpicMap = Record<string, string>; // { 'BA-405': '[QA] USDC (ETH) 추가' }

// ── 필터 타입 ─────────────────────────────────────────────────────
export type EpicFilter = 'all' | 'none' | string; // 'all' | 'none' | 'BA-405' ...

// ── 테마 타입 ─────────────────────────────────────────────────────
export type Theme = 'light' | 'dark';
