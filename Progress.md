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

## 2026-07-23 — 発砲音を実録音WAVサンプルに差し替え

- **作業内容**（合成音→ユーザー提供の `machinegun_single.wav` に変更）:
  - 元WAV（44100Hz/16bit/**ステレオ**/約1.4秒/241KB）を Node で **モノラル化・末尾の無音をトリム(0.55秒)・末尾25msフェードアウト** して軽量化し、**base64でHTMLに直接埋め込み**（外部素材なしの単一HTML要件を維持）。埋め込み後 HTML は約133KB。
  - `SND` に `gun`(AudioBuffer) と `decodeGun()` を追加。`init()` 内で `decodeAudioData`（コールバック形式＝Safari互換）で非同期デコード。
  - `punch(tier)` をサンプル再生に変更：`AudioBufferSourceNode` を master(→コンプレッサー)経由で再生。tierで音量(.66/.82/1.0)とピッチ(playbackRate .9〜1.0)を変化、毎発±2%ランダムピッチ。連打で自然にマシンガン化。tier2は低域sineを少し重ねて重量感。
  - 従来の合成発砲音は `punchSyn()` として残し、**デコード完了前(初弾)や AudioBuffer 未取得時のフォールバック**に使用。
  - 埋め込みは `const GUN_B64` にプレースホルダを置き、Nodeスクリプトで base64 を注入。復号検証で RIFF/WAVE・mono・16bit・0.55秒を確認。`node --check` 構文OK。
- **変更ファイル**: TypingShooter.html（`const GUN_B64` 追加、`SND.init`/`SND.decodeGun`/`SND.punch`/`SND.punchSyn`）。ソースの `machinegun_single.wav` はリポジトリ直下に残置（埋め込み済みのためゲーム動作には不要）。
- **次にやること**: 実機で音量・連打時の重なり具合を確認（必要なら tier別 gain や master .5 を調整）。Playableサイズ上限に対する余裕確認（現状 HTML 単体 ~133KB）。

## 2026-07-23 — スマホ英語モード用ABCキーボードを自作

- **作業内容**（英語モードも純正キーボードを廃止し自作化）:
  - スマホ英語モード用に **オンスクリーンABCキーボード** を追加（QWERTY 10/9/7＋横長SPACEキー）。英文お題のスペースにも対応。英語は濁点処理不要のため、各キーは `handleChar(小文字)` を直接呼ぶだけのシンプル構成。
  - キーボードを言語別に遅延生成する仕組みに変更：`buildKbd()`→`buildKanaKbd()` に改名し `buildEnKbd()` を追加。`kbdBuiltLang` で現在の生成言語を追跡し、`ensureKbd()`（`syncKbd` から呼ぶ）で言語が変わったら作り直す。
  - `kbdActive()` を `isTouch && scene==='play'`（日英どちらでも有効）に変更。`startStage`/`startEndless`/canvas `pointerdown` から英語時の `hin.focus()` を撤去し、**スマホでは純正キーボードを一切出さない**（#5 縦画面の画面隠れを英語でも解消）。
  - `renderPend()` は日本語キーボード時のみ更新するようガード追加。CSS に `.key.en`（10キー用に少し小さめ）と `.key.wide`（SPACE）を追加。ヘルプ文言を更新。
- **変更ファイル**: TypingShooter.html（CSS `.key.en`/`.key.wide`、JS キーボードモジュール／`kbdActive`/`syncKbd`/`ensureKbd`/`startStage`/`startEndless`/`pointerdown`、ヘルプ文言）
- **検証**: `node --check` 構文OK。実機相当のNode検証で「the storm」(スペース含む)ミス0完走、「cat」＋誤打で1ミス計上を確認。
- **次にやること**: 実機で英語キーボードの打鍵感・キー幅（10キー横並び）の確認。`hin`（非表示input）とその input/compositionend リスナーはスマホでは未使用になったが、PCや将来用に残置。

## 2026-07-22 — 発砲音をリアル化

- **作業内容**（`SND` の発砲音合成を刷新）:
  - `punch(tier)` を実銃寄りの4要素構成に：①鋭いクラック（撃発の立ち上がり・超短ハイパスノイズ）②高→低へフィルター掃引する発砲ブラスト（ガス膨張の“ドッ”）③低域の胴鳴り（sine下降）④減衰する残響テール（遅延した低域ノイズ）。tier 0/1/2 で規模をエスカレート。
  - `noise()` を拡張：`fq2`（フィルター周波数を fq→fq2 へ指数掃引）と `shape`（WaveShaper による軽いサチュレーション＝“ザラつき”）を追加。`shaperCurve()` ヘルパー新設。
  - 発砲ごとにブラスト周波数を ±10% ランダム変化（`v()`）させ、機械的な繰り返し感を低減。
  - `init()` に **DynamicsCompressor** を追加（master→comp→destination）。連射時のピークを抑えつつ密度・パンチを出す（threshold -14dB / ratio 4 / attack 2ms / release 120ms）。全効果音が経由。
- **変更ファイル**: TypingShooter.html（`SND.init`/`SND.noise`/`SND.punch` ＋ `SND.shaperCurve` 追加）
- **テスト**: `node --check` で構文OK。※ブラウザ音声の試聴は要実機確認（この環境では Web Audio 非対応）。他の効果音（select/miss/defeat/fanfare 等）もコンプレッサー経由になるが軽微。
- **次にやること**: 実機で音量バランス確認（必要なら master gain .5 の再調整）。

## 2026-07-22 — GitHub Pages 公開

- **作業内容**:
  - ルートURLでゲームが開けるよう、`TypingShooter.html` へリダイレクトする `index.html` を追加（本体HTMLは無変更）。
  - リポジトリを **public** に変更し、GitHub Pages（main / ルート）を有効化。ビルド完了・HTTP 200 を確認。
  - 公開URL: **https://myuta7.github.io/typing-shooter/**
- **変更ファイル**: （新規）index.html
- **次にやること**: 実機（スマホ）での動作確認、YouTube Playable SDK 対応。
