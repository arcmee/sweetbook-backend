# sweetbook-backend

`sweetbook-backend`는 SweetBook 프로토타입의 백엔드 API 서버입니다.

주요 역할:

- 회원가입, 로그인, JWT 세션 복원
- 그룹, 이벤트, 사진, 좋아요, 오너 검토 처리
- 사진 업로드 파일 저장
- SweetBook estimate / submit 프로토타입 연동
- 프론트엔드가 사용하는 workspace snapshot 제공

## 기술 스택

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Vitest

## 로컬 실행

```powershell
cd sweetbook-backend
npm install
npm start
```

health check:

```text
http://localhost:3000/health
```

## 환경 변수

기본적으로 아래 값을 사용합니다.

```env
DATABASE_URL=postgres://sweetbook:sweetbook@localhost:5432/sweetbook
SWEETBOOK_ENV=sandbox
SWEETBOOK_API_KEY=replace-with-your-sandbox-key
```

추가로 사용할 수 있는 값:

- `HOST`
- `PORT`
- `PROTOTYPE_UPLOAD_DIR`

## 테스트

```powershell
npm test
```

저장소 단독 실행과 테스트 절차는 아래 문서를 참고하세요.

- [TESTING.md](C:/Users/user/my-projects/sweetbook/sweetbook-backend/TESTING.md)

프로젝트 전체를 Docker로 함께 실행하는 방법은 `sweetbook-harness`를 참고하세요.

- [sweetbook-harness/TESTING.md](C:/Users/user/my-projects/sweetbook/sweetbook-harness/TESTING.md)

## 주요 API 범주

- 인증
- 그룹
- 이벤트
- 사진 업로드 / 좋아요
- 페이지 플랜
- SweetBook estimate / submit

## 현재 범위

이 저장소는 production-ready 서비스보다는 과제 제출과 MVP 검증에 맞춘 프로토타입 범위를 중심으로 구성되어 있습니다.
