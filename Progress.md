# Progress — TypingShooter

作業ごとに追記する。各エントリは「日付 / 作業内容 / 変更ファイル / 次にやること」。

---

## 2026-07-22 — リポジトリ化

- **作業内容**:
  - Claude(Cowork) で開発した単一HTMLタイピングシューターを GitHub リポジトリ化。
  - 配布用の `TypingShooter_handoff/` サブフォルダにあった成果物（`TypingShooter.html` / `TypingShooter_仕様書.md` / `test.js`〜`test5.js`）をフォルダ直下へ移動。
  - Playwright テストの `page.goto` が Linux 絶対パス（`file:///home/user/TypingFighter/...`）にハードコードされていたため、`__dirname` 基準の `pathToFileURL` に変更してクロスプラットフォーム化（HTML・仕様書は無変更）。
  - `CLAUDE.md`（プロジェクトルール）/ `README.md` / `package.json` / `.gitignore` / 本 `Progress.md` を新規作成。
  - `git init` → 初回コミット → `gh repo create typing-shooter --private --source=. --push` で private リポジトリを作成・プッシュ。
- **変更ファイル**: （移動）TypingShooter.html, TypingShooter_仕様書.md, test*.js /（テストのみ編集）test.js〜test5.js の goto 行 /（新規）CLAUDE.md, README.md, package.json, .gitignore, Progress.md
- **次にやること**:
  - `npx playwright install chromium` 後に `npm test` を実機で通す（未実行）。
  - YouTube Playable の SDK 要件（サイズ上限・SDK タグ・CTA コールバック等）への適合。
  - 進行状況の永続化（現状メモリ保持のみ）。
