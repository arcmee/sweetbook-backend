# backend 테스트 안내

이 문서는 `sweetbook-backend` 저장소를 단독으로 확인하거나, 전체 통합 실행 문서로 이동하기 위한 간단한 안내입니다.

## 단독 실행

```powershell
cd sweetbook-backend
npm install
npm start
```

health check:

```text
http://localhost:3000/health
```

## 테스트

```powershell
npm test
```

## 통합 실행

frontend, postgres, SweetBook sandbox 흐름까지 함께 검증하려면 `sweetbook-harness`를 기준으로 실행합니다.

참고 문서:

- [sweetbook-harness/TESTING.md](C:/Users/user/my-projects/sweetbook/sweetbook-harness/TESTING.md)
