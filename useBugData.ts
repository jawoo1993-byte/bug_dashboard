import { useState, useCallback } from 'react';
import { Issue, EpicMap, BugsResponse } from './types';

// 설정 없으면 상대 경로 사용 → Vite 프록시(/api → localhost:3001)로 전달
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type LoadStep = 1 | 2 | 3;
type StatusType = 'idle' | 'loading' | 'success' | 'error';

interface UseBugDataReturn {
  issues: Issue[];
  epicMap: EpicMap;
  epicKeys: string[];
  status: StatusType;
  step: LoadStep;
  errorMsg: string;
  updatedAt: string;
  load: () => Promise<void>;
}

export function useBugData(): UseBugDataReturn {
  const [issues, setIssues]     = useState<Issue[]>([]);
  const [epicMap, setEpicMap]   = useState<EpicMap>({});
  const [epicKeys, setEpicKeys] = useState<string[]>([]);
  const [status, setStatus]     = useState<StatusType>('idle');
  const [step, setStep]         = useState<LoadStep>(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      // Step 1: 버그 이슈 조회
      setStep(1);
      const r1 = await fetch(`${API_BASE}/api/bugs?project=BA&maxResults=300`);
      if (!r1.ok) {
        const e = await r1.json().catch(() => ({}));
        throw new Error(`서버 오류 ${r1.status}: ${(e as { error?: string }).error ?? r1.statusText}`);
      }
      const d1: BugsResponse = await r1.json();

      // Step 2: 에픽 이름 조회
      setStep(2);
      const keys = [...new Set(d1.issues.map(i => i.epic).filter(Boolean))] as string[];
      let emap: EpicMap = {};
      if (keys.length) {
        const r2 = await fetch(`${API_BASE}/api/epics?keys=${keys.join(',')}`);
        if (r2.ok) emap = await r2.json();
      }

      // Step 3: 완료
      setStep(3);
      setIssues(d1.issues);
      setEpicMap(emap);
      setEpicKeys(keys);
      setUpdatedAt(
        new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      );
      setStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetworkError = /failed to fetch|network error|load failed/i.test(msg);
      const is500 = /500|Internal Server Error/i.test(msg);
      let displayMsg = msg;
      if (isNetworkError) {
        displayMsg = '백엔드 API 서버에 연결할 수 없습니다. localhost:3001에서 API 서버가 실행 중인지 확인해 주세요.';
      } else if (is500) {
        displayMsg = `${msg}\n\n※ 500 오류는 보통 백엔드에서 Jira API 호출이 실패할 때 발생합니다. Jira API 토큰(및 이메일), Jira URL 등 환경 변수가 설정되어 있는지, 백엔드 서버 로그의 상세 에러를 확인해 주세요.`;
      }
      setErrorMsg(displayMsg);
      setStatus('error');
    }
  }, []);

  return { issues, epicMap, epicKeys, status, step, errorMsg, updatedAt, load };
}
