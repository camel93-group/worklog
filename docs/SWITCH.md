# 신구조 전환 절차 (voiceMeetBot 한 세트 → meetbot + worklog + worklog-data)

준비 완료 상태: `~/workspace/meetbot`(봇), `~/workspace/worklog`(서버, 빌드·스모크 검증 완료),
`~/worklog-data`(빈 폴더). 아래는 전환 시 실행 — 회의 중이 아닐 때, 총 1~2분 중단.

## 1. 기존 서비스 중지

```bash
launchctl bootout gui/$(id -u)/com.martin.voicemeetbot
launchctl bootout gui/$(id -u)/com.martin.worklog-web
cd ~/workspace/voiceMeetBot/web && docker compose down
```

## 2. 데이터 이동 (같은 디스크라 즉시 완료)

```bash
mv ~/workspace/voiceMeetBot/data/* ~/worklog-data/
```

## 3. 새 LaunchAgent 등록 + DB 기동

```bash
cp ~/workspace/meetbot/launchd/com.martin.voicemeetbot.plist ~/Library/LaunchAgents/
cp ~/workspace/worklog/launchd/com.martin.worklog-web.plist ~/Library/LaunchAgents/
cd ~/workspace/worklog && docker compose up -d
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.martin.voicemeetbot.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.martin.worklog-web.plist
```

## 4. ailog 훅 이관 (기존 폴더 수집 중단 → 새 폴더 수집 시작)

```bash
ailog uninstall ~/workspace/voiceMeetBot
ailog uninstall ~/workspace/voiceMeetBot/web
ailog install ~/workspace/meetbot   && cd ~/workspace/meetbot   && ailog sync
ailog install ~/workspace/worklog   && cd ~/workspace/worklog   && ailog sync
```

projectId(루트 커밋 해시)가 같아서 사이트 이력은 그대로 이어지고, 표시명만
meetbot / worklog로 바뀐다.

## 5. 검증

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3500/   # 200
docker ps | grep worklog-db                                       # Up
tail -5 ~/Library/Logs/worklog/bot.log                            # 봇 로그인 확인
```

디스코드에서 음성채널 입장 → 자동 녹음 시작 확인.

## 6. 안정화 후 정리 (며칠 뒤)

```bash
rm -rf ~/workspace/voiceMeetBot   # 옛 한 세트 폴더 (데이터는 이미 이동됨)
```
