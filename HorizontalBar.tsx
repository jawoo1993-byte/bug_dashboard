import React from 'react';
import { Issue } from './types';

interface HorizontalBarProps {
  issues: Issue[];
  field: 'assignee' | 'reporter';
  fillClass: 'bar-a' | 'bar-r';
}

const HorizontalBar: React.FC<HorizontalBarProps> = ({ issues, field, fillClass }) => {
  const counts: Record<string, number> = {};
  issues.forEach(i => {
    const v = i[field] || '미배정';
    counts[v] = (counts[v] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="hbl">
      {sorted.map(([name, count]) => (
        <div key={name} className="hbr">
          <div className="hbn" title={name}>{name}</div>
          <div className="hbt">
            <div className={`hbf ${fillClass}`} style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <div className="hbc">{count}</div>
        </div>
      ))}
    </div>
  );
};

export default HorizontalBar;
