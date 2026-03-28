# API Flow Tester

n8n 스타일의 노드 기반 UI로 백엔드 API 연속 호출을 시각적으로 테스트하는 도구입니다.

## 주요 기능

- **노드 기반 플로우 편집** — 드래그 앤 드롭으로 노드를 배치하고 연결
- **HTTP Request 노드** — GET/POST/PUT/PATCH/DELETE, 헤더/쿼리 파라미터/바디 설정
- **Set Variable 노드** — 공통 변수 사전 정의 (string / JSON 객체 모두 지원)
- **Extract Variable 노드** — 응답 JSON에서 값을 추출해 다음 노드에 전달
- **Assertion(기대값 검증)** — HTTP 상태코드 또는 응답 JSON 값 조건 설정, 실패 시 플로우 중단
- **단독 실행** — 전체 플로우 실행 없이 특정 노드만 개별 실행
- **템플릿 변수** — `{{vars.token}}`, `{{nodes.login.response.data.token}}` 형식으로 노드 간 데이터 전달
- **실행 결과 시각화** — 노드별 성공/실패 상태, curl 명령어, 응답 코드/바디 확인
- **플로우 저장/불러오기** — JSON 파일로 Export/Import
- **CLI 러너** — UI 없이 저장된 JSON 파일을 커맨드라인에서 실행, 복수 파일 일괄 테스트 지원

## 요구사항

- Node.js 18+
- Python 3.9+

## 실행

```bash
# 의존성 설치 (최초 1회)
cd frontend && npm install

# 서버 실행
./start.sh
```

| 서비스 | 주소 |
|--------|------|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 프록시 | http://localhost:8000 |

## 사용 예시 — 회원가입 → 로그인 → 인증 API 호출

### 1. Set Variable 노드

공통으로 쓸 변수를 정의합니다. 각 변수는 `string` 또는 `JSON` 타입으로 설정할 수 있습니다.

**string 타입 예시:**

| 변수명 | 타입 | 값 |
|--------|------|----|
| `userId` | string | `testuser123` |
| `password` | string | `mypassword!` |

**JSON 타입 예시:**

```
변수명: defaultHeaders   타입: JSON
값:
{
  "Content-Type": "application/json",
  "X-App-Version": "1.0.0"
}
```

JSON 변수는 필드를 `{{vars.defaultHeaders.Content-Type}}` 형식으로 참조하거나,
`{{vars.defaultHeaders}}` 로 객체 전체를 JSON 문자열로 주입할 수 있습니다.

### 2. HTTP Request 노드 — 회원가입

```
POST https://api.example.com/auth/register
Body (JSON):
{
  "username": "{{vars.userId}}",
  "password": "{{vars.password}}"
}
```

**Assert 탭 설정 예시:**

| Type | Operator | 기대값 |
|------|----------|--------|
| HTTP Status | == | 201 |

### 3. HTTP Request 노드 — 로그인

```
POST https://api.example.com/auth/login
Body (JSON):
{
  "username": "{{vars.userId}}",
  "password": "{{vars.password}}"
}
```

**Assert 탭 설정 예시:**

| Type | Path | Operator | 기대값 |
|------|------|----------|--------|
| HTTP Status | — | == | 200 |
| JSON Path | `data.token` | exists | — |

### 4. Extract Variable 노드

로그인 응답에서 JWT 토큰을 추출합니다.

| 변수명 | JSON 경로 |
|--------|-----------|
| `accessToken` | `response.data.token` |

### 5. HTTP Request 노드 — 인증이 필요한 API

```
GET https://api.example.com/me
Headers:
  Authorization: Bearer {{vars.accessToken}}
```

### 6. 실행

노드를 Start → 순서대로 연결한 뒤 우측 상단 **실행** 버튼을 클릭합니다.

특정 노드만 재실행하려면 노드를 클릭해 설정 패널을 열고 **단독 실행** 버튼을 사용합니다.
이전 전체 실행에서 쌓인 변수(`vars`)와 응답(`nodes`)이 컨텍스트로 재사용됩니다.

## Assertion 조건 연산자

| 연산자 | 설명 | 예시 |
|--------|------|------|
| `==` | 일치 | status == 201 |
| `!=` | 불일치 | status != 500 |
| `contains` | 문자열 포함 | data.message contains "success" |
| `>` | 초과 | data.count > 0 |
| `<` | 미만 | data.errorCode < 1 |
| `exists` | 값 존재 여부 | data.token exists |

## 템플릿 변수 참조

| 문법 | 설명 |
|------|------|
| `{{vars.키}}` | string 변수 또는 JSON 변수 전체 (객체는 JSON 문자열로 직렬화) |
| `{{vars.키.필드}}` | JSON 타입 변수의 특정 필드 접근 |
| `{{nodes.노드ID.response.data.필드}}` | 특정 노드의 응답 데이터 직접 참조 |
| `{{nodes.노드ID.response.status}}` | 특정 노드의 HTTP 상태 코드 |

## 실행 결과 패널

노드 클릭 시 우측 패널에서 확인할 수 있습니다.

| 섹션 | 내용 |
|------|------|
| curl | 실제 전송된 요청을 curl 명령어로 표시 (복사 가능) |
| Response | HTTP 상태코드 + 응답 바디 JSON (복사 가능) |
| Assertions | 각 조건의 ✓/✗ 결과와 실제값 표시 |
| 추출된 변수 | Extract Variable 노드에서 저장된 변수 목록 |

## CLI 러너

UI 없이 저장된 플로우 JSON 파일을 커맨드라인에서 실행합니다.

```bash
# 단일 파일
python3 backend/runner.py flow.json

# 복수 파일
python3 backend/runner.py flow1.json flow2.json flow3.json

# 디렉터리 내 *.json 전체
python3 backend/runner.py flows/
```

**출력 예시:**

```
API Flow Tester — CLI Runner
총 2개 플로우 실행

──────────────────────────────────────────────────
  register-login.json
──────────────────────────────────────────────────
  ✓ Set Variable          (3ms)
      userId = testuser123
  ✓ 회원가입              GET https://api.example.com/auth/register  [201] (120ms)
      ✓ status == 201
  ✓ 로그인                POST https://api.example.com/auth/login    [200] (98ms)
  ✓ Extract Token         (1ms)
      accessToken = eyJhbGci...
  ✓ 내 정보 조회          GET https://api.example.com/me             [200] (45ms)

──────────────────────────────────────────────────
  결과 요약
──────────────────────────────────────────────────
  ✓ register-login.json
  ✓ profile-update.json

  2 passed  0 failed  / 2 total
```

Assertion 실패 시 플로우가 중단되며 exit code 1을 반환합니다.
Assert 미설정 노드는 HTTP 상태코드와 무관하게 다음 노드로 진행합니다.
CI/CD 파이프라인에서 `python3 backend/runner.py flows/` 형태로 통합 테스트를 실행할 수 있습니다.

## 프로젝트 구조

```
n8n/
├── frontend/
│   └── src/
│       ├── types/          # 타입 정의 (Assertion 포함)
│       ├── store/          # Zustand 상태 관리
│       ├── engine/         # 실행 엔진 (위상 정렬 + 템플릿 치환 + Assertion)
│       └── components/
│           ├── nodes/      # 노드 컴포넌트 (HTTP, Variable, Extract)
│           └── panels/     # 우측 설정 패널 및 결과 뷰어
├── backend/
│   ├── main.py             # FastAPI CORS 프록시 서버
│   └── runner.py           # CLI 러너 (UI 없이 flow.json 실행)
└── start.sh                # 통합 실행 스크립트
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + TypeScript + Vite |
| 노드 캔버스 | @xyflow/react (React Flow) |
| 상태 관리 | Zustand |
| 스타일 | Tailwind CSS |
| 백엔드 프록시 | FastAPI + httpx |
