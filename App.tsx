import React, { useEffect, useMemo, useState } from 'react';
import { useBugData } from './useBugData';
import { EpicFilter, Theme } from './types';
import KpiCards from './KpiCards';
import { StatusChart, PriorityChart, MonthlyChart, CompareChart } from './Charts';
import HorizontalBar from './HorizontalBar';
import IssueList from './IssueList';
import './App.css';

const App: React.FC = () => {
  const { issues, epicMap, epicKeys, status, step, errorMsg, updatedAt, load } = useBugData();
  const [activeEpic, setActiveEpic] = useState<EpicFilter>('all');
  const [theme, setTheme] = useState<Theme>('light');

  // 최초 마운트 시 로딩
  useEffect(() => { load(); }, [load]);

  // 탭/창에 다시 들어올 때마다 데이터 갱신 (페이지 진입 시 리프레시)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  // 테마 적용
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // 에픽 필터 적용
  const filtered = useMemo(() => {
    if (activeEpic === 'all')  return issues;
    if (activeEpic === 'none') return issues.filter(i => !i.epic);
    return issues.filter(i => i.epic === activeEpic);
  }, [issues, activeEpic]);

  const isLoading = status === 'loading';
  const isError   = status === 'error';
  const isSuccess = status === 'success';

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="hdr">
        <div className="hdr-l">
          <span className="logo">BA</span>
          <div>
            <div className="h-ttl">BDACS-ALL 버그 대시보드</div>
            <div className="h-sub">
              <span className={`sd sd-${isLoading ? 'loading' : isError ? 'error' : 'ok'}`} />
              {isLoading ? '데이터 로딩 중...' : isError ? '로드 실패' : `실시간 · ${issues.length}건`}
            </div>
          </div>
        </div>
        <div className="hdr-r">
          {updatedAt && <span className="ts">업데이트: {updatedAt}</span>}
          <button className="btn btn-primary" onClick={load} disabled={isLoading}>
            <span className={isLoading ? 'spin-icon' : ''}>↻</span> 새로고침
          </button>
          <button className="btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙 다크 모드' : '☀️ 라이트 모드'}
          </button>
        </div>
      </header>

      {/* ── Epic 필터 ── */}
      <div className="fil-bar">
        <span className="fil-lbl">Epic</span>
        {(['all', ...epicKeys, 'none'] as EpicFilter[]).map(key => {
          const label = key === 'all' ? '전체' : key === 'none' ? '에픽 없음' : (epicMap[key] || key);
          const short = label.length > 22 ? label.slice(0, 22) + '…' : label;
          return (
            <button
              key={key}
              className={`eb${activeEpic === key ? ' on' : ''}`}
              title={label}
              onClick={() => setActiveEpic(key)}
            >
              {short}
            </button>
          );
        })}
      </div>

      <main className="main">

        {/* ── 로딩 화면 ── */}
        {isLoading && (
          <div className="load-sc">
            <div className="ring" />
            <div className="load-ttl">Jira 버그 데이터를 불러오는 중...</div>
            <div className="steps">
              {[
                { n: 1, label: '버그 이슈 조회 중' },
                { n: 2, label: '에픽 정보 수집 중' },
                { n: 3, label: '차트 생성 중' },
              ].map(({ n, label }) => (
                <div key={n} className={`step${step === n ? ' active' : step > n ? ' done' : ''}`}>
                  <span className="step-ic">{step > n ? '✓' : step === n ? '⏳' : '○'}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 에러 박스 ── */}
        {isError && (
          <div className="err-box">
            <div className="err-ttl">⚠️ 데이터 로드 실패</div>
            <div className="err-msg">{errorMsg}</div>
          </div>
        )}

        {/* ── 대시보드 ── */}
        {isSuccess && (
          <div className="dash">

            {/* KPI */}
            <KpiCards issues={filtered} />

            {/* Row 1: 상태 + 우선순위 */}
            <div className="row2">
              <div className="card">
                <div className="ct"><span className="dot" />상태별 버그 현황</div>
                <div className="ch"><StatusChart issues={filtered} /></div>
              </div>
              <div className="card">
                <div className="ct"><span className="dot" />우선순위 분포</div>
                <div className="ch"><PriorityChart issues={filtered} /></div>
              </div>
            </div>

            {/* Row 2: 월별 + 담당자 */}
            <div className="row3">
              <div className="card">
                <div className="ct"><span className="dot" />월별 버그 등록 추이</div>
                <div className="csm"><MonthlyChart issues={filtered} /></div>
              </div>
              <div className="card">
                <div className="ct"><span className="dot" />담당자별 버그 수</div>
                <HorizontalBar issues={filtered} field="assignee" fillClass="bar-a" />
              </div>
            </div>

            {/* Row 3: 보고자 + 비교 */}
            <div className="row3">
              <div className="card">
                <div className="ct"><span className="dot" />보고자별 버그 수</div>
                <HorizontalBar issues={filtered} field="reporter" fillClass="bar-r" />
              </div>
              <div className="card">
                <div className="ct"><span className="dot" />담당자 vs 보고자 비교</div>
                <div className="csm"><CompareChart issues={filtered} /></div>
              </div>
            </div>

            {/* 이슈 목록 */}
            <div className="card">
              <div className="ct">
                <span className="dot" />버그 이슈 목록
                <span className="cnt">({filtered.length}건)</span>
              </div>
              <IssueList issues={filtered} />
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;
