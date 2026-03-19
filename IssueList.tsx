import React from 'react';
import { Issue } from './types';

const BADGE_CLASS: Record<string, string> = {
  'Done (Test)': 'bd',
  '진행 중':     'bi',
  '해야 할 일':  'bt',
  'BLOCK':       'bb',
};
const BADGE_LABEL: Record<string, string> = {
  'Done (Test)': 'DONE',
  '진행 중':     '진행중',
  '해야 할 일':  'TODO',
  'BLOCK':       'BLOCK',
};
const PRIO_CLASS: Record<string, string> = {
  Highest: 'ph', High: 'pHi', Medium: 'pm', Low: 'pl', Lowest: 'plo',
};

interface IssueListProps {
  issues: Issue[];
}

const IssueList: React.FC<IssueListProps> = ({ issues }) => {
  if (!issues.length) {
    return <div className="empty-msg">해당 에픽에 버그가 없습니다</div>;
  }

  return (
    <div className="ilist">
      {issues.map(i => (
        <div key={i.key} className="irow">
          <div className="ikey">{i.key}</div>
          <div title={i.summary}>
            <span className={`prio ${PRIO_CLASS[i.priority] ?? 'pm'}`} />
            <span className="isum">{i.summary}</span>
          </div>
          <span className={`badge ${BADGE_CLASS[i.status] ?? 'bt'}`}>
            {BADGE_LABEL[i.status] ?? i.status}
          </span>
        </div>
      ))}
    </div>
  );
};

export default IssueList;
