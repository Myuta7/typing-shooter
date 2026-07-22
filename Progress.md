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

## 2026-07-22 — 序盤難易度の緩和 & お題ラベルの重なり修正

- **作業内容**（実機フィードバック対応・その1）:
  - **ボスが序盤から強すぎる問題**を緩和。ボスのお題を段階制に変更：`bossLevel` を導入し、`short`(Lv2単語) / `mid`(Lv3単語) / `long`(文章) を出し分け。ステージ1〜2は短い単語ボス、3〜4は長い単語、5以降で従来の文章。エンドレスは wave5 まで単語、以降文章。
  - `pickBossPhrases(n, level)` に `level` 引数追加。`spawnBoss` から `G.conf.bossLevel` を渡す。
  - **攻撃までの猶予（ゲージ秒数）を序盤で延長**：通常敵 `gauge` は n<=3 で +3.5s / n<=5 で +1.5s。ボス `bossGauge` は序盤 max(13-n*.5,6)+3.5（stage1で約16秒）。エンドレスも序盤に加算。
  - **序盤は短い文字数の敵をたくさん**：`wordMax` を導入し、stage1 は最大2かな・stage2 は最大3かなに制限（日本語のみ。`pickWord` でプールをフィルタ）。`total` を 5+n*2 → 6+n*2 に増量。
  - **お題ローマ字がロックオンマーカーと重なる問題**を修正。`drawLabel` で、ロック中/マーカー中の敵はお題ラベルを一段高く（`base = e.y - 60*scale`）持ち上げ、半径52の選択リングと被らないように。選択中ローマ字サイズ 13→15 に拡大して視認性向上。
- **変更ファイル**: TypingShooter.html（`stageConf`/`endlessConf`/`pickWord`/`pickBossPhrases`/`spawnBoss`/`drawLabel`）
- **テスト**: 環境未構築（node_modules/chromium 未導入）のため `npm test` 未実行。今回の変更はローマ字エンジン非改変のため `node --check` で構文確認のみ実施（OK）。

## 2026-07-22 — スマホ自作フリックキーボード導入（濁点ミス＆キーボード隠れを解決）

- **作業内容**（実機フィードバック対応・その2）:
  - スマホの日本語入力を **純正キーボード＋IME をやめ、ゲーム内の自作フリックかなキーボードに置換**。これで以下を同時解決：
    - **#3 濁点/半濁点でミス判定** → 「お題認識型の保留(pending)」方式で解決。基本かなをフリック→そのかなが正解なら即発射／濁点系の変化形が正解のときだけ保留し、`゛゜小`キーで変化（は→ば→ぱ）。正解に到達した瞬間に確定発射。途中経過（は・ば）は**ミスにならない**。実機相当のNode検証で「ぱんだ」ミス0完走を確認。
    - **#5 縦画面で純正キーボードが画面を隠す** → 純正KBを出さず、キーボードはゲーム下の固定領域に常時表示。`resize()` でキーボード高さ分を確保しゲームを上側に配置（`visualViewport` 対応）。
  - キーボード仕様: 12キー（あかさたな…）＋`゛゜小`＋`⌫`。各かなキーは タップ=あ段／上下左右フリックで い う え お。`⌫`は保留のキャンセル。`#flickpop` でフリック中の選択かなをプレビュー。
  - スマホ日本語は `kanaMode` 固定（`PlainTyper`でお題かなと直接照合）＝ローマ字非表示になり **#1 のローマ字とマーカー被りもスマホでは解消**。旧「スマホ入力」トグル(英字/かな)は非表示化。
  - 英語モードのスマホは従来通り純正キーボード（`hin`）。PCは自作KBを生成しない。
  - ヘルプ画面のスマホ操作説明を新キーボード向けに更新。
- **変更ファイル**: TypingShooter.html（CSS: `#kbd`/`#flickpop`、HTML: `#kbd`/`#flickpop` 追加、JS: フリックKBモジュール／`resize`改修／`syncKbd`／`startStage`・`startEndless`・`toTitle`・`showResult`・`showGameOver`・`pointerdown`・言語トグル・初期化の連携、ヘルプ文言）
- **既知の残課題 / 次にやること**:
  - 英語モードのスマホは純正キーボードのままなので、縦画面の画面隠れが残る（必要ならABCオンスクリーンKBを追加）。
  - `test4.js`（非表示inputフォーカス）はスマホ日本語では入力経路が変わったため、実機/Playwrightでの再確認が必要。
  - 実機（iPhone/Android）でフリック操作感・キーボード高さ・セーフエリアの最終確認。
  - `npm test`（Playwright）は環境構築後に実行して回帰確認。

## 2026-07-22 — GitHub Pages 公開

- **作業内容**:
  - ルートURLでゲームが開けるよう、`TypingShooter.html` へリダイレクトする `index.html` を追加（本体HTMLは無変更）。
  - リポジトリを **public** に変更し、GitHub Pages（main / ルート）を有効化。ビルド完了・HTTP 200 を確認。
  - 公開URL: **https://myuta7.github.io/typing-shooter/**
- **変更ファイル**: （新規）index.html
- **次にやること**: 実機（スマホ）での動作確認、YouTube Playable SDK 対応。
