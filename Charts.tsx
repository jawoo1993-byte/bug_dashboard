import React, { useEffect, useRef } from 'react';
import {
  Chart,
  BarController, DoughnutController, LineController,
  BarElement, ArcElement, PointElement, LineElement,
  CategoryScale, LinearScale,
  Tooltip, Legend,
} from 'chart.js';
import { Issue } from './types';

// Chart.js 컴포넌트 등록
Chart.register(
  BarController, DoughnutController, LineController,
  BarElement, ArcElement, PointElement, LineElement,
  CategoryScale, LinearScale,
  Tooltip, Legend
);

const GC = 'rgba(0,0,0,.06)';
const TC = '#8896b8';

// ── 상태별 막대 차트 ──────────────────────────────────────────────
export const StatusChart: React.FC<{ issues: Issue[] }> = ({ issues }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const statuses = ['해야 할 일', '진행 중', 'BLOCK', 'Done (Test)'];
    const colors   = ['#4361ee', '#f59e0b', '#ef4444', '#22c55e'];
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: statuses,
        datasets: [{
          data: statuses.map(s => issues.filter(i => i.status === s).length),
          backgroundColor: colors,
          borderRadius: 7,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw}건` } } },
        scales: {
          x: { grid: { color: GC }, ticks: { color: TC, font: { family: 'Noto Sans KR', size: 11 } } },
          y: { grid: { color: GC }, ticks: { color: TC }, beginAtZero: true },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [issues]);

  return <canvas ref={ref} />;
};

// ── 우선순위 도넛 차트 ────────────────────────────────────────────
export const PriorityChart: React.FC<{ issues: Issue[] }> = ({ issues }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const total = issues.length;

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const prios  = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#94a3b8'];
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels: prios,
        datasets: [{ data: prios.map(p => issues.filter(i => i.priority === p).length), backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '63%',
        plugins: {
          legend: { position: 'right', labels: { color: TC, font: { family: 'Noto Sans KR', size: 11 }, padding: 10, usePointStyle: true } },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}건 (${total ? Math.round((c.raw as number) / total * 100) : 0}%)` } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [issues, total]);

  return <canvas ref={ref} />;
};

// ── 월별 라인 차트 ────────────────────────────────────────────────
export const MonthlyChart: React.FC<{ issues: Issue[] }> = ({ issues }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const m: Record<string, number> = {};
    issues.forEach(i => { if (i.created) m[i.created] = (m[i.created] || 0) + 1; });
    const labels = Object.keys(m).sort();
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: labels.map(l => m[l]),
          borderColor: '#4361ee', backgroundColor: 'rgba(67,97,238,.07)',
          borderWidth: 2.5, pointBackgroundColor: '#4361ee', pointRadius: 5,
          fill: true, tension: 0.35,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw}건` } } },
        scales: {
          x: { grid: { color: GC }, ticks: { color: TC, font: { family: 'JetBrains Mono', size: 11 } } },
          y: { grid: { color: GC }, ticks: { color: TC }, beginAtZero: true },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [issues]);

  return <canvas ref={ref} />;
};

// ── 담당자 vs 보고자 비교 차트 ────────────────────────────────────
export const CompareChart: React.FC<{ issues: Issue[] }> = ({ issues }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const aC: Record<string, number> = {};
    const rC: Record<string, number> = {};
    issues.forEach(i => {
      aC[i.assignee] = (aC[i.assignee] || 0) + 1;
      rC[i.reporter] = (rC[i.reporter] || 0) + 1;
    });
    const names = [...new Set([
      ...Object.keys(aC).sort((a, b) => aC[b] - aC[a]).slice(0, 5),
      ...Object.keys(rC).sort((a, b) => rC[b] - rC[a]).slice(0, 5),
    ])].slice(0, 6);
    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels: names,
        datasets: [
          { label: '담당자', data: names.map(n => aC[n] || 0), backgroundColor: '#4361ee', borderRadius: 5, borderSkipped: false },
          { label: '보고자', data: names.map(n => rC[n] || 0), backgroundColor: '#0ea5e9', borderRadius: 5, borderSkipped: false },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { color: TC, font: { family: 'Noto Sans KR', size: 11 }, usePointStyle: true, padding: 10 } },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw}건` } },
        },
        scales: {
          x: { grid: { color: GC }, ticks: { color: TC, font: { family: 'Noto Sans KR', size: 10 }, maxRotation: 25 } },
          y: { grid: { color: GC }, ticks: { color: TC }, beginAtZero: true },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [issues]);

  return <canvas ref={ref} />;
};
