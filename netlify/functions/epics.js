/**
 * Netlify Function: GET /api/epics → Jira 에픽 이름 조회
 * 쿼리: keys (쉼표 구분)
 */
const JIRA_BASE = process.env.JIRA_BASE_URL || process.env.ATLASSIAN_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_TOKEN = process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN;
const auth =
  JIRA_EMAIL && JIRA_TOKEN
    ? Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
    : null;

function jiraFetch(path) {
  if (!JIRA_BASE) throw new Error('JIRA_BASE_URL 환경 변수가 필요합니다.');
  if (!auth) throw new Error('JIRA_EMAIL, JIRA_API_TOKEN 환경 변수가 필요합니다.');
  const base = JIRA_BASE.replace(/\/$/, '');
  const href = `${base}${path.startsWith('/') ? path : '/' + path}`;
  return fetch(href, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
  });
}

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  const q = event.queryStringParameters || {};
  const keys = (q.keys || '').trim();
  if (!keys) {
    return { statusCode: 200, headers, body: JSON.stringify({}) };
  }

  try {
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
    return { statusCode: 200, headers, body: JSON.stringify(epicMap) };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Internal Server Error' }),
    };
  }
};
