#!/usr/bin/env bash
# ailog 업로드 인증 토큰 랜덤 생성 스크립트
#
# 사용법:
#   scripts/generate-ailog-token.sh          # 토큰을 출력만 한다
#   scripts/generate-ailog-token.sh --write  # .env 의 AILOG_TOKEN 을 갱신한다
set -euo pipefail

cd "$(dirname "$0")/.."

TOKEN="$(openssl rand -hex 24)"

if [[ "${1:-}" != "--write" ]]; then
  echo "$TOKEN"
  exit 0
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

if grep -q '^AILOG_TOKEN=' .env; then
  tmp="$(mktemp)"
  sed "s|^AILOG_TOKEN=.*|AILOG_TOKEN=${TOKEN}|" .env > "$tmp"
  mv "$tmp" .env
else
  echo "AILOG_TOKEN=${TOKEN}" >> .env
fi

echo ".env 의 AILOG_TOKEN 을 갱신했습니다: ${TOKEN}"
echo
echo "주의:"
echo "  - 호스트 직접 실행용 .env.local 의 AILOG_TOKEN 도 같은 값으로 변경하세요."
echo "  - 업로드하는 쪽(ailog 클라이언트)의 토큰도 함께 바꿔야 인증이 통과합니다."
echo "  - docker compose 로 실행 중이면 'docker compose up -d' 로 재적용하세요."
