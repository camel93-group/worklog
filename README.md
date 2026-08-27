# worklog

디스코드 음성회의 봇(voiceMeetBot)이 남긴 회의 레코드를 보여주고, ailog 아티팩트를 탐색하는 [Next.js](https://nextjs.org) 웹앱입니다.

## 실행 (Docker)

DB(PostgreSQL)와 웹앱 모두 docker compose 로 실행합니다.

```bash
# 1. 환경 변수 파일 생성
cp .env.example .env

# 2. DB 비밀번호 생성 후 .env 에 반영
scripts/generate-db-password.sh --write

# 3. 빌드 및 실행
docker compose up -d --build
```

기본 접속 주소는 `http://localhost:3500` 입니다 (포트는 `.env` 의 `WORKLOG_WEB_PORT` 로 변경).

## 환경 변수

### `.env` — docker compose 용 (샘플: `.env.example`)

| 변수 | 설명 |
| --- | --- |
| `WORKLOG_DB_PASSWORD` | PostgreSQL 비밀번호. `scripts/generate-db-password.sh` 로 생성 |
| `WORKLOG_DB_PORT` | 호스트에 노출되는 DB 포트 (기본 5433, 127.0.0.1 전용) |
| `WORKLOG_WEB_PORT` | 호스트에 노출되는 웹앱 포트 (기본 3500) |
| `WORKLOG_DATA_DIR` | PostgreSQL 데이터가 저장되는 호스트 디렉터리 |
| `MEETING_DATA_DIR` | 봇이 회의 레코드를 저장하는 호스트 디렉터리 (컨테이너 `/data` 로 마운트) |
| `AILOG_TOKEN` | ailog 업로드 인증 토큰 |

### `.env.local` — 호스트에서 직접 실행할 때 (샘플: `.env.local.example`)

`npm run dev` / `next start` 로 앱을 도커 없이 띄울 때 사용합니다.
`DATABASE_URL` 의 비밀번호는 `.env` 의 `WORKLOG_DB_PASSWORD` 와 맞춰야 합니다.

`.env`, `.env.local` 은 비밀값을 담고 있어 git 에 커밋되지 않습니다 (`.gitignore` 의 `.env*`).
샘플 파일(`.env.example`, `.env.local.example`)만 커밋됩니다.

## 비밀값 생성 (DB 비밀번호 · ailog 토큰)

두 스크립트 모두 인자 없이 실행하면 랜덤 값을 출력만 하고, `--write` 를 주면 `.env` 를 갱신합니다.

```bash
scripts/generate-db-password.sh --write  # .env 의 WORKLOG_DB_PASSWORD 갱신
scripts/generate-ailog-token.sh --write  # .env 의 AILOG_TOKEN 갱신
```

DB 비밀번호 주의사항:

- 이미 초기화된 DB 볼륨(`WORKLOG_DATA_DIR`)에는 비밀번호 변경이 자동 반영되지 않습니다.
  기존 DB 를 유지한 채 바꾸려면 `ALTER USER worklog WITH PASSWORD '...'` 를 직접 실행하세요.
- 호스트 실행용 `.env.local` 의 `DATABASE_URL` 도 함께 갱신해야 합니다.

ailog 토큰 주의사항:

- 업로드하는 쪽(ailog 클라이언트)의 토큰도 같은 값으로 바꿔야 인증이 통과합니다.
- 호스트 실행용 `.env.local` 의 `AILOG_TOKEN` 도 함께 갱신해야 합니다.

값 변경 후 docker compose 로 실행 중이면 `docker compose up -d` 로 재적용하세요.

## 데이터 디렉터리

PostgreSQL 데이터(`WORKLOG_DATA_DIR`, 기본 `../worklog-data`)는 git 에 포함되지 않습니다.
저장소 안에 두더라도 `.gitignore` 의 `worklog-data/` 규칙으로 제외됩니다.

## 알려진 제약 (Docker 실행 시)

- 요약 재생성 기능은 호스트의 Claude Code CLI(`CLAUDE_BIN`)를 실행하므로 컨테이너 안에서는 동작하지 않습니다. 이 기능이 필요하면 앱을 호스트에서 직접 실행하세요 (`launchd/com.martin.worklog-web.plist` 참고).

## 개발 (호스트에서 직접 실행)

```bash
cp .env.local.example .env.local   # 값 채우기
docker compose up -d worklog-db    # DB 만 도커로
npm run dev                        # http://localhost:3500
```
