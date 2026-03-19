/**
 * 버그 대시보드용 Jira API 프록시 (캘린더 사이트처럼 한 프로젝트에서 연동)
 * .env에 Jira 설정만 넣으면 됨.
 */
const http = require('http');
const url = require('url');

require('dotenv').config();

const JIRA_BASE = process.env.JIRA_BASE_URL || process.env.ATLASSIAN_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN;
const PORT = Number(process.env.PORT) || 3001;

const auth = (JIRA_EMAIL && JIRA_TOKEN)
  ? Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
  : null;

function jiraFetch(path, opts = {}) {
  if (!JIRA_BASE) throw new Error('JIRA_BASE_URL(또는 ATLASSIAN_URL) 환경 변수가 필요합니다.');
  if (!auth) throw new Error('JIRA_EMAIL, JIRA_API_TOKEN(또는 ATLASSIAN_API_TOKEN) 환경 변수가 필요합니다.');
  const base = JIRA_BASE.replace(/\/$/, '');
  const href = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : '/' + path}`;
  return fetch(href, {
    ...opts,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      ...opts.headers,
    },
  });
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function handleBugs(req, res, project, maxResults) {
  const jql = `project=${encodeURIComponent(project)} AND type=Bug ORDER BY created DESC`;
  const fields = 'summary,status,priority,assignee,reporter,created,parent';
  const jiraRes = await jiraFetch(
    `/rest/api/3/search?jql=${jql}&maxResults=${maxResults || 300}&fields=${fields}`
  );
  if (!jiraRes.ok) {
    const err = await jiraRes.json().catch(() => ({}));
    send(res, jiraRes.status, { error: err.errorMessages?.join?.(' ') || jiraRes.statusText });
    return;
  }
  const data = await jiraRes.json();
  const issues = (data.issues || []).map((i) => {
    const f = i.fields || {};
    return {
      key: i.key,
      summary: f.summary || '',
      status: (f.status && f.status.name) || '',
      priority: (f.priority && f.priority.name) || '',
      assignee: (f.assignee && f.assignee.displayName) || '',
      reporter: (f.reporter && f.reporter.displayName) || '',
      created: (f.created || '').slice(0, 7),
      epic: (f.parent && f.parent.key) || null,
    };
  });
  send(res, 200, { total: data.total || issues.length, issues });
}

async function handleEpics(req, res, keys) {
  if (!keys || !keys.length) {
    send(res, 200, {});
    return;
  }
  const epicMap = {};
  await Promise.all(
    keys.split(',').map(async (key) => {
      const k = key.trim();
      if (!k) return;
      try {
        const jiraRes = await jiraFetch(`/rest/api/3/issue/${k}?fields=summary`);
        if (jiraRes.ok) {
          const data = await jiraRes.json();
          epicMap[k] = (data.fields && data.fields.summary) || k;
        }
      } catch (_) {}
    })
  );
  send(res, 200, epicMap);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = url.parse(req.url, true);
    if (u.pathname === '/api/bugs' && req.method === 'GET') {
      const project = u.query.project || 'BA';
      const maxResults = u.query.maxResults || '300';
      await handleBugs(req, res, project, maxResults);
      return;
    }
    if (u.pathname === '/api/epics' && req.method === 'GET') {
      await handleEpics(req, res, u.query.keys || '');
      return;
    }
    if (u.pathname === '/api/health') {
      send(res, 200, { ok: true, jira: !!JIRA_BASE && !!auth });
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  } catch (err) {
    console.error(err);
    send(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`[bug-dashboard-api] http://localhost:${PORT}`);
  if (!JIRA_BASE || !auth) {
    console.warn('[bug-dashboard-api] Jira 미설정: .env에 JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN 을 넣어 주세요.');
  }
});
