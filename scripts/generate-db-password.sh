#!/usr/bin/env bash
# DB 비밀번호용 랜덤 난수 생성 스크립트
#
# 사용법:
#   scripts/generate-db-password.sh          # 비밀번호를 출력만 한다
#   scripts/generate-db-password.sh --write  # .env 의 WORKLOG_DB_PASSWORD 를 갱신한다
set -euo pipefail

cd "$(dirname "$0")/.."

PASSWORD="$(openssl rand -hex 24)"

if [[ "${1:-}" != "--write" ]]; then
  echo "$PASSWORD"
  exit 0
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

if grep -q '^WORKLOG_DB_PASSWORD=' .env; then
  tmp="$(mktemp)"
  sed "s|^WORKLOG_DB_PASSWORD=.*|WORKLOG_DB_PASSWORD=${PASSWORD}|" .env > "$tmp"
  mv "$tmp" .env
else
  echo "WORKLOG_DB_PASSWORD=${PASSWORD}" >> .env
fi

echo ".env 의 WORKLOG_DB_PASSWORD 를 갱신했습니다: ${PASSWORD}"
echo
echo "주의:"
echo "  - .env.local 의 DATABASE_URL 비밀번호도 같은 값으로 변경하세요."
echo "  - 이미 초기화된 postgres 볼륨(\${WORKLOG_DATA_DIR})에는 자동 반영되지 않습니다."
echo "    기존 DB 를 유지하려면 ALTER USER 로 직접 변경해야 합니다."
