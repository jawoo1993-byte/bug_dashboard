import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const JIRA_BASE = env.JIRA_BASE_URL || env.ATLASSIAN_URL || '';
  const JIRA_EMAIL = env.JIRA_EMAIL || '';
  const JIRA_TOKEN = env.JIRA_API_TOKEN || env.ATLASSIAN_API_TOKEN || '';
  const auth =
    JIRA_EMAIL && JIRA_TOKEN
      ? Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
      : null;

  async function jiraFetch(path: string, opts: RequestInit = {}) {
    if (!JIRA_BASE) throw new Error('JIRA_BASE_URL(또는 ATLASSIAN_URL) 환경 변수가 필요합니다.');
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

  return {
    plugins: [
      react(),
      {
        name: 'jira-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/bugs') && req.method === 'GET') {
              const url = new URL(req.url, 'http://localhost');
              const project = url.searchParams.get('project') || 'BA';
              const maxResults = url.searchParams.get('maxResults') || '300';
              try {
                const jql = `project=${project} AND type=Bug ORDER BY created DESC`;
                const max = Number(maxResults) || 300;
                const fieldsParam = 'summary,status,priority,assignee,reporter,created,parent';
                const searchUrl = `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=${max}&fields=${encodeURIComponent(fieldsParam)}`;
                const jiraRes = await jiraFetch(searchUrl);
                const contentType = jiraRes.headers.get('content-type') || '';
                const text = await jiraRes.text();
                if (!contentType.includes('application/json') || text.trim().startsWith('<')) {
                  const msg =
                    jiraRes.status === 401 || jiraRes.status === 403
                      ? 'Jira 인증 실패입니다. .env의 JIRA_EMAIL, JIRA_API_TOKEN(및 Jira 사이트 URL)을 확인해 주세요.'
                      : 'Jira가 JSON 대신 HTML을 반환했습니다. JIRA_BASE_URL이 올바른지, API 토큰이 유효한지 확인해 주세요.';
                  res.statusCode = jiraRes.status >= 400 ? jiraRes.status : 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: msg }));
                  return;
                }
                let data: Record<string, unknown>;
                try {
                  data = JSON.parse(text) as Record<string, unknown>;
                } catch {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Jira 응답을 파싱할 수 없습니다. URL·토큰을 확인해 주세요.' }));
                  return;
                }
                if (!jiraRes.ok) {
                  const errMsg =
                    (data.errorMessages as string[] | undefined)?.join?.(' ') ||
                    (data.error as string) ||
                    jiraRes.statusText;
                  res.statusCode = jiraRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: errMsg }));
                  return;
                }
                const issues = ((data.issues as unknown[] | undefined) || []).map((i: unknown) => {
                  const f = (i as { fields?: Record<string, unknown> }).fields || {};
                  return {
                    key: (i as { key?: string }).key,
                    summary: (f.summary as string) || '',
                    status: ((f.status as { name?: string })?.name) || '',
                    priority: ((f.priority as { name?: string })?.name) || '',
                    assignee: ((f.assignee as { displayName?: string })?.displayName) || '',
                    reporter: ((f.reporter as { displayName?: string })?.displayName) || '',
                    created: ((f.created as string) || '').slice(0, 7),
                    epic: ((f.parent as { key?: string })?.key) || null,
                  };
                });
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    total: (data.total as number | undefined) ?? issues.length,
                    issues,
                  })
                );
                return;
              } catch (err) {
                console.error('[vite api] /api/bugs', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: err instanceof Error ? err.message : 'Internal Server Error',
                  })
                );
                return;
              }
            }
            if (req.url?.startsWith('/api/epics') && req.method === 'GET') {
              const url = new URL(req.url, 'http://localhost');
              const keys = (url.searchParams.get('keys') || '').trim();
              if (!keys) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end('{}');
                return;
              }
              try {
                const epicMap: Record<string, string> = {};
                await Promise.all(
                  keys.split(',').map(async (key) => {
                    const k = key.trim();
                    if (!k) return;
                    try {
                      const jiraRes = await jiraFetch(`/rest/api/3/issue/${k}?fields=summary`);
                      const ct = jiraRes.headers.get('content-type') || '';
                      const body = await jiraRes.text();
                      if (jiraRes.ok && ct.includes('application/json') && !body.trim().startsWith('<')) {
                        const data = JSON.parse(body) as { fields?: { summary?: string } };
                        epicMap[k] = data.fields?.summary || k;
                      }
                    } catch (_) {}
                  })
                );
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(epicMap));
                return;
              } catch (err) {
                console.error('[vite api] /api/epics', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error: err instanceof Error ? err.message : 'Internal Server Error',
                  })
                );
                return;
              }
            }
            next();
          });
          if (JIRA_BASE && auth) {
            console.log('[vite] Jira API 미들웨어: /api/bugs, /api/epics (로컬 .env 사용)');
          } else {
            console.warn('[vite] .env에 JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN 을 넣어 주세요.');
          }
        },
      },
    ],
    server: {
      port: 3000,
      // 프록시 제거 — 같은 서버에서 미들웨어로 /api 처리
    },
  };
});
