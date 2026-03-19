import React from 'react';
import { Issue } from './types';

interface KpiCardsProps {
  issues: Issue[];
}

function pct(n: number, t: number) {
  return t ? Math.round((n / t) * 100) : 0;
}

const KpiCards: React.FC<KpiCardsProps> = ({ issues }) => {
  const t    = issues.length;
  const ing  = issues.filter(i => i.status === '진행 중').length;
  const todo = issues.filter(i => i.status === '해야 할 일').length;
  const done = issues.filter(i => i.status === 'Done (Test)').length;
  const blk  = issues.filter(i => i.status === 'BLOCK').length;

  const cards = [
    { label: '전체 버그',    value: t,    sub: 'BDACS-ALL',          cls: 'total' },
    { label: '진행 중',     value: ing,  sub: `전체의 ${pct(ing,t)}%`,  cls: 'inprog' },
    { label: '해야 할 일',  value: todo, sub: `전체의 ${pct(todo,t)}%`, cls: 'todo' },
    { label: 'Done (Test)', value: done, sub: `전체의 ${pct(done,t)}%`, cls: 'done' },
    { label: 'BLOCK',       value: blk,  sub: `전체의 ${pct(blk,t)}%`,  cls: 'blk' },
  ];

  return (
    <div className="kpi-row">
      {cards.map(c => (
        <div key={c.label} className={`kc kc-${c.cls}`}>
          <div className="kl">{c.label}</div>
          <div className="kv">{c.value}</div>
          <div className="kp">{c.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default KpiCards;
