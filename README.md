# sweetbook-backend

`sweetbook-backend`는 SweetBook 프로토타입의 백엔드 서비스입니다.  
Fastify 기반 API, PostgreSQL 기반 프로토타입 데이터 저장소, JWT 인증, 파일 업로드, 그리고 SweetBook sandbox 연동용 estimate/submit 흐름을 제공합니다.

## 개요

이 서비스는 다음 역할을 담당합니다.

- 프로토타입 사용자 회원가입, 로그인, 세션 복원
- 그룹, 이벤트, 초대, 좋아요, 오너 승인, 주문 준비 상태 관리
- 이벤트 사진 업로드 및 로컬 파일 저장
- SweetBook estimate / submit 프로토타입 API 실행
- 프론트엔드가 사용하는 workspace snapshot 제공

## 기술 스택

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- `@fastify/multipart`
- Vitest

## 실행 환경

### 필수 환경 변수

`.env.example`을 기준으로 `.env`를 준비합니다.

```env
SWEETBOOK_ENV=sandbox
SWEETBOOK_API_KEY=replace-with-your-sandbox-key
DATABASE_URL=postgres://sweetbook:sweetbook@localhost:5432/sweetbook
```

추가로 사용할 수 있는 값:

- `HOST`
  기본값: `0.0.0.0`
- `PORT`
  기본값: `3000`
- `PROTOTYPE_UPLOAD_DIR`
  업로드 파일 저장 디렉토리
  기본값: `var/prototype-uploads`

### 로컬 실행

```powershell
cd C:\Users\user\my-projects\sweetbook\sweetbook-backend
npm install
npm start
```

헬스체크:

```text
GET http://localhost:3000/health
```

정상 응답:

```json
{"status":"ok"}
```

## Docker 실행

저장소 루트의 `docker-compose.yml` 기준으로 PostgreSQL, backend, frontend를 함께 실행할 수 있습니다.

```powershell
cd C:\Users\user\my-projects\sweetbook
docker compose up -d postgres
```

backend만 로컬에서 실행하려면 PostgreSQL만 Docker로 올린 뒤 `sweetbook-backend`에서 `npm start`를 사용하면 됩니다.

## 인증

현재 인증은 JWT 기반 프로토타입 구현입니다.

지원 기능:

- `POST /api/prototype/auth/signup`
- `POST /api/prototype/auth/login`
- `GET /api/prototype/auth/session`
- `POST /api/prototype/auth/logout`
- `POST /api/prototype/account/password`

프론트엔드는 로그인 성공 시 받은 토큰을 `Authorization: Bearer <token>` 형식으로 전달합니다.

### 기본 시드 계정

데이터베이스가 비어 있을 경우 프로토타입 사용자와 워크스페이스 데이터가 시드됩니다.

기본 로그인 계정:

- 아이디: `demo`
- 비밀번호: `sweetbook123!`

## 데이터 초기화와 시드

서버 시작 시 수행되는 작업:

- 인증 사용자 테이블 초기화
- 워크스페이스 관련 테이블 초기화
- 기본 프로토타입 사용자 시드
- 기본 프로토타입 그룹/이벤트/사진 시드

중요:

- 서버 재시작만으로 기존 데이터가 자동 삭제되지는 않습니다.
- 다만 비어 있는 DB에서는 기본 프로토타입 데이터가 다시 채워집니다.
- PostgreSQL 볼륨을 제거하거나 스키마를 직접 드롭하면 데이터는 초기화됩니다.

## 주요 API

### Workspace

- `GET /api/prototype/workspace`

현재 로그인한 사용자 기준 workspace snapshot을 반환합니다.

### 그룹

- `POST /api/prototype/groups`
- `POST /api/prototype/groups/:groupId/invitations`
- `POST /api/prototype/groups/:groupId/owner`
- `POST /api/prototype/groups/:groupId/leave`
- `GET /api/prototype/users/search?q=...`

### 이벤트

- `POST /api/prototype/events`
- `POST /api/prototype/events/:eventId/close-voting`
- `POST /api/prototype/events/:eventId/extend-voting`
- `POST /api/prototype/events/:eventId/owner-approval`

### 사진

- `POST /api/prototype/photos`
- `POST /api/prototype/photo-uploads`
- `GET /api/prototype/photos/:photoId/asset`
- `POST /api/prototype/photos/:photoId/likes`

### 페이지 플랜 / 주문 준비

- `POST /api/prototype/events/:eventId/page-plan/selection`
- `POST /api/prototype/events/:eventId/page-plan/cover`
- `POST /api/prototype/events/:eventId/page-plan/pages/:pageId/layout`
- `POST /api/prototype/events/:eventId/page-plan/pages/:pageId/note`

### SweetBook 연동

- `POST /api/prototype/sweetbook/estimate`
- `POST /api/prototype/sweetbook/submit`

## 파일 업로드

사진 업로드는 multipart로 처리됩니다.

- 업로드 제한: 기본 10MB
- 저장 위치: `var/prototype-uploads` 또는 `PROTOTYPE_UPLOAD_DIR`

업로드 API:

```text
POST /api/prototype/photo-uploads
```

필수 multipart 필드:

- `eventId`
- `caption`
- `file`

## 테스트

전체 테스트:

```powershell
npm test
```

watch 모드:

```powershell
npm run test:watch
```

## SweetBook sandbox 도구

다음 스크립트가 포함되어 있습니다.

- `npm run sweetbook:smoke`
- `npm run sweetbook:probe`
- `npm run sweetbook:probe:isolation`

이 스크립트들은 sandbox 연동 상태 확인이나 write 동작 점검에 사용합니다.

## 디렉토리 구조

```text
src/
  application/   도메인/유스케이스 로직
  data/          PostgreSQL, env, 외부 API 클라이언트
  presentation/  Fastify 앱과 엔트리포인트
tests/           테스트 코드
var/             프로토타입 업로드 파일 저장 위치
```

## 현재 성격

이 저장소는 production-ready 서비스보다는 프로토타입 및 MVP 검증에 초점을 맞추고 있습니다.

현재 범위:

- 그룹 기반 사진 수집 흐름
- 이벤트 투표/좋아요
- 오너 리뷰 및 페이지 플랜 저장
- SweetBook handoff 프로토타입

아직 별도 고도화가 필요한 영역:

- 실서비스 수준의 권한/보안 정책
- 결제 및 주문 후속 처리
- webhook / tracking / failure recovery
- 정교한 운영용 에러 처리
