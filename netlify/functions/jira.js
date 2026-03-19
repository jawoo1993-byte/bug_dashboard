/**
 * Netlify Function: Jira API 프록시 (배포된 사이트에서 /api 요청 처리)
 * Netlify 대시보드 → Site configuration → Environment variables 에서 설정:
 *   JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN
 */

const JIRA_BASE = process.env.JIRA_BASE_URL || process.env.ATLASSIAN_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN;

const auth =
  JIRA_EMAIL && JIRA_TOKEN
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
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
      ...opts.headers,
    },
  });
}

async function handleBugs(project, maxResults) {
  const jql = `project=${encodeURIComponent(project)} AND type=Bug ORDER BY created DESC`;
  const fields = 'summary,status,priority,assignee,reporter,created,parent';
  const jiraRes = await jiraFetch(
    `/rest/api/3/search?jql=${jql}&maxResults=${maxResults || 300}&fields=${fields}`
  );
  if (!jiraRes.ok) {
    const err = await jiraRes.json().catch(() => ({}));
    return {
      statusCode: jiraRes.status,
      body: JSON.stringify({ error: err.errorMessages?.join?.(' ') || jiraRes.statusText }),
    };
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
  return {
    statusCode: 200,
    body: JSON.stringify({ total: data.total || issues.length, issues }),
  };
}

async function handleEpics(keys) {
  if (!keys || !keys.trim()) {
    return { statusCode: 200, body: JSON.stringify({}) };
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
  return { statusCode: 200, body: JSON.stringify(epicMap) };
}

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const q = event.queryStringParameters || {};
  const endpoint = q.endpoint;

  try {
    if (endpoint === 'bugs') {
      const result = await handleBugs(q.project || 'BA', q.maxResults || '300');
      return { ...result, headers };
    }
    if (endpoint === 'epics') {
      const result = await handleEpics(q.keys || '');
      return { ...result, headers };
    }
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing or invalid endpoint (use endpoint=bugs or endpoint=epics)' }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
