# BDACS-ALL 버그 대시보드

Jira 버그 이슈를 대시보드로 보여주는 React + Vite 프로젝트.  
Jira API 연동용 서버가 같은 저장소에 포함되어 있어, `.env`만 설정하면 로컬에서 바로 사용할 수 있습니다.

## 실행 방법

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **Jira 연동 설정**  
   `.env.example`을 복사해 `.env`를 만들고 다음 값을 채우세요.
   - `JIRA_BASE_URL` — Jira 사이트 URL (예: `https://회사도메인.atlassian.net`)
   - `JIRA_EMAIL` — Jira 로그인 이메일
   - `JIRA_API_TOKEN` — [Atlassian API 토큰](https://id.atlassian.com/manage-profile/security/api-tokens)에서 발급

3. **실행**
   ```bash
   npm run dev:all
   ```
   - API 서버(3001) + 프론트(3000)가 함께 실행됩니다.
   - 브라우저에서 http://localhost:3000 접속.

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 프론트만 실행 (Vite, 포트 3000) |
| `npm run api` | Jira API 서버만 실행 (포트 3001) |
| `npm run dev:all` | API + 프론트 동시 실행 |
| `npm run build` | 프로덕션 빌드 |

## Netlify 배포 시 (Environment variables)

Netlify에 올리면 `/api` 요청은 Netlify Function으로 연결됩니다. **반드시** 아래 환경 변수를 넣어야 데이터가 로드됩니다.

**Netlify 대시보드 → Site configuration → Environment variables → Add a variable (또는 Add environment variables)**

| 변수 이름 | 값 예시 | 비고 |
|-----------|---------|------|
| `JIRA_BASE_URL` | `https://회사도메인.atlassian.net` | Jira 사이트 URL |
| `JIRA_EMAIL` | `your@email.com` | Jira 로그인 이메일 |
| `JIRA_API_TOKEN` | 발급한 API 토큰 문자열 | [Atlassian API 토큰](https://id.atlassian.com/manage-profile/security/api-tokens)에서 발급 |

- 세 개 모두 **필수**입니다. 하나라도 비어 있으면 500 또는 데이터 로드 실패가 납니다.
- 값은 **비공개**로 두세요 (Netlify에서 기본이 비공개).
- 변수 추가/수정 후에는 **Deploys → Trigger deploy → Deploy site** 로 다시 배포해야 반영됩니다.

## 기술 스택

- React 18, TypeScript, Vite
- Chart.js (차트)
- Node (로컬용 Jira API 서버) / Netlify Functions (배포용)
