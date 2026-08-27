import { execFile } from 'node:child_process';

const TIMEOUT_MS = 5 * 60_000;
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? '/Users/martin/.local/bin/claude';

// 봇(src/summarizer/claude-cli.js)과 동일한 호출 규약·요약 형식을 유지한다
const SUMMARIZE_PROMPT = `다음은 디스코드 음성회의 트랜스크립트입니다. 한국어로 회의록을 작성해주세요.

형식 (해당 항목이 없으면 "없음"으로 표기):
## 📌 결정사항
- 확정된 결정만

## ✅ 액션아이템
- **담당자**: 할 일 (담당자가 불명확하면 "미정")

## 💬 논의만 된 것
- 결론 없이 논의된 주제

간결하게 작성하고, 트랜스크립트에 없는 내용을 지어내지 마세요.
"교정어(원문: 원래표기)" 형태의 표기는 교정어를 기준으로 이해하세요.

--- 트랜스크립트 ---
`;

export function summarize(transcript: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      /* turbopackIgnore: true */
      CLAUDE_BIN,
      ['-p', '--output-format', 'json', '--allowedTools', ''],
      { timeout: TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`claude 실행 실패: ${err.message} ${stderr?.slice(0, 300) ?? ''}`));
        }
        let data;
        try {
          data = JSON.parse(stdout);
        } catch {
          return reject(new Error(`claude 응답 파싱 실패: ${stdout.slice(0, 300)}`));
        }
        if (data.is_error) {
          return reject(new Error(`claude 오류 응답: ${String(data.result).slice(0, 300)}`));
        }
        console.log(`[web/summarize] claude 비용: $${data.total_cost_usd}`);
        resolve(data.result);
      },
    );
    child.stdin!.write(SUMMARIZE_PROMPT + transcript);
    child.stdin!.end();
  });
}
