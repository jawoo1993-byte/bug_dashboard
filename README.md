# BDACS-ALL 버그 대시보드

Jira 버그 이슈를 대시보드로 보여주는 React + Vite 프로젝트.  
**배포 없이 로컬에서만 확인**해도 되고, 괜찮을 때만 푸시해서 Netlify에 올리면 됩니다.

---

## 로컬에서 확인하기 (배포 제한 없음)

수정할 때마다 Netlify에 배포하지 않아도 됩니다. **로컬에서 먼저 확인**한 뒤, 괜찮을 때만 `git push` 하세요.

1. **의존성 설치** (최초 1회)
   ```bash
   npm install
   ```

2. **Jira 연동 설정** (최초 1회)  
   `.env.example`을 복사해 `.env`를 만들고 값을 채우세요.
   - `JIRA_BASE_URL` — Jira 사이트 URL (예: `https://회사도메인.atlassian.net`)
   - `JIRA_EMAIL` — Jira 로그인 이메일
   - `JIRA_API_TOKEN` — [Atlassian API 토큰](https://id.atlassian.com/manage-profile/security/api-tokens)에서 발급

3. **로컬 실행**
   ```bash
   npm run dev:all
   ```
   - API(3001) + 프론트(3000)가 동시에 뜹니다.
   - 브라우저에서 **http://localhost:3000** 접속해서 확인하세요.
   - 코드 수정 시 화면이 자동으로 갱신됩니다.

4. **괜찮으면 배포**
   - 로컬에서 확인이 끝났을 때만 `git add` → `git commit` → `git push` 하면 Netlify가 배포합니다.

### 스크립트 요약

| 명령어 | 용도 |
|--------|------|
| **`npm run dev:all`** | **일상 개발** — 로컬에서 API + 프론트 동시 실행 (hot reload) |
| `npm run dev` | 프론트만 실행 (API는 따로 `npm run api` 필요) |
| `npm run api` | Jira API 서버만 실행 (포트 3001) |
| `npm run build` | 프로덕션 빌드 (Netlify 배포 시 사용) |
| `npm run preview:local` | 빌드 후 로컬에서 빌드 결과 미리 보기 (전체 동작 확인은 `dev:all` 권장) |

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
