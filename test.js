const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  await page.goto(require('url').pathToFileURL(require('path').join(__dirname, 'TypingShooter.html')).href);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shot_title.png' });

  // ヘルプ画面
  await page.click('#btHelp');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot_help.png' });
  await page.click('#btHelpClose');

  // --- ローマ字エンジン単体テスト ---
  const romaResult = await page.evaluate(() => {
    const cases = [
      ['しんかんせん', 'shinkansenn', true], ['しんかんせん', 'sinkansenn', true],
      ['きょうりゅう', 'kyouryuu', true], ['ろぼっと', 'robotto', true],
      ['ろぼっと', 'roboltuto', true], ['ちきゅう', 'chikyuu', true],
      ['ちきゅう', 'tikyuu', true], ['じゃんぷ', 'janpu', true],
      ['じゃんぷ', 'zyannpu', true], ['かんじ', 'kanji', true],
      ['んあ', 'na', false], ['んあ', 'nna', true],
      ['ねこ', 'neko', true], ['ねこ', 'neqo', false],
      ['しゃしん', 'syasinn', true], ['しゃしん', 'shashinn', true],
    ];
    const results = [];
    for (const [word, input, expect] of cases) {
      const t = new RomaTyper(word);
      let ok = true;
      for (const ch of input) { if (!t.type(ch)) { ok = false; break; } }
      results.push({ word, input, pass: (ok && t.done()) === expect });
    }
    return results;
  });
  const romaFails = romaResult.filter(r => !r.pass);

  // --- ステージ1開始・マーカー&ロックオン実キー操作テスト ---
  await page.evaluate(() => { TF.SND.muted = true; TF.startStage(1); });
  await page.waitForTimeout(2500); // intro明け・敵到着待ち

  const m0 = await page.evaluate(() => ({ marker: !!TF.G.marker, locked: TF.G.locked }));
  await page.keyboard.press('f'); // マーカー移動
  await page.keyboard.press('d');
  const m1 = await page.evaluate(() => ({ marker: !!TF.G.marker, locked: TF.G.locked, miss: TF.G.miss }));
  await page.keyboard.press(' '); // ロックオン
  const m2 = await page.evaluate(() => ({ locked: TF.G.locked, sel: !!TF.G.sel }));
  await page.keyboard.press(' '); // 解除
  const m3 = await page.evaluate(() => ({ locked: TF.G.locked, sel: !!TF.G.sel }));
  await page.keyboard.press(' '); // 再ロック(この後の自動プレイ用)
  const lockTest = m0.marker && !m0.locked && m1.marker && !m1.locked && m1.miss === 0 &&
                   m2.locked && m2.sel && !m3.locked && !m3.sel;

  // ロックしていない状態でのタイプは無効(ミスにならない)テスト
  await page.keyboard.press(' '); // いったん解除
  await page.keyboard.press('z');
  const noLockType = await page.evaluate(() => ({ miss: TF.G.miss, hits: TF.G.hits }));

  // --- 自動プレイでステージ1クリア ---
  let defeated = false, bossShot = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    const st = await page.evaluate(() => {
      const G = TF.G;
      if (!G.locked) {
        const t = G.enemies.filter(e => e.state !== 'die').sort((a, b) => a.x - b.x)[0];
        if (t) { G.marker = t; TF.spaceAction(); }
      }
      return {
        scene: G.scene, rem: G.sel ? G.sel.typer.remain() : null,
        boss: G.sel ? !!G.sel.boss : false,
      };
    });
    if (st.scene === 'result') { defeated = true; break; }
    if (st.scene === 'over') break;
    if (st.rem) {
      for (const ch of st.rem.slice(0, 6)) await page.evaluate(c => TF.handleChar(c), ch);
      if (st.boss && !bossShot) { bossShot = true; await page.screenshot({ path: 'shot_boss.png' }); }
    }
    await page.waitForTimeout(60);
  }
  await page.screenshot({ path: 'shot_end.png' });
  const final = await page.evaluate(() => ({ hits: TF.G.hits, miss: TF.G.miss, time: TF.G.clearTime }));

  console.log('=== RESULT ===');
  console.log('roma fails:', JSON.stringify(romaFails));
  console.log('lock-on key test:', lockTest, JSON.stringify({ m0, m1, m2, m3 }));
  console.log('unlock typing ignored (hits should be low, miss 0):', JSON.stringify(noLockType));
  console.log('stage cleared:', defeated, JSON.stringify(final));
  console.log('console errors:', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
  const ok = romaFails.length === 0 && lockTest && defeated && errors.length === 0 && noLockType.miss === 0;
  process.exit(ok ? 0 : 1);
})();
