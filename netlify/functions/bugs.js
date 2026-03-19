/**
 * Netlify Function: GET /api/bugs → Jira 버그 이슈 조회
 * 쿼리: project, maxResults (선택)
 */
const JIRA_BASE = process.env.JIRA_BASE_URL || process.env.ATLASSIAN_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN;
const auth =
  JIRA_EMAIL && JIRA_TOKEN
    ? Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
    : null;

function jiraFetch(path, opts = {}) {
  if (!JIRA_BASE) throw new Error('JIRA_BASE_URL 환경 변수가 필요합니다.');
  if (!auth) throw new Error('JIRA_EMAIL, JIRA_API_TOKEN 환경 변수가 필요합니다.');
  const base = JIRA_BASE.replace(/\/$/, '');
  const href = `${base}${path.startsWith('/') ? path : '/' + path}`;
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

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const q = event.queryStringParameters || {};
  const project = q.project || 'BA';
  const maxResults = q.maxResults || '300';

  try {
    const jql = `project=${project} AND type=Bug ORDER BY created DESC`;
    const max = Number(maxResults) || 300;
    const fieldsParam = 'summary,status,priority,assignee,reporter,created,parent';
    const searchUrl = `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${max}&fields=${encodeURIComponent(fieldsParam)}`;
    const jiraRes = await jiraFetch(searchUrl);
    if (!jiraRes.ok) {
      const err = await jiraRes.json().catch(() => ({}));
      return {
        statusCode: jiraRes.status,
        headers,
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
      headers,
      body: JSON.stringify({ total: data.total || issues.length, issues }),
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
