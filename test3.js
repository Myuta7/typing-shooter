const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(require('url').pathToFileURL(require('path').join(__dirname, 'TypingShooter.html')).href);
  await page.waitForTimeout(500);

  // 射撃エフェクトのスクショ(連打直後)
  await page.evaluate(() => { TF.SND.muted = true; TF.startStage(1); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const G = TF.G;
    const t = G.enemies.filter(e => e.state !== 'die').sort((a,b) => a.x-b.x)[0];
    if (t) { G.marker = t; TF.spaceAction(); }
    G.heat = 10; // ドガガガ tier
    const rem = G.sel.typer.remain();
    for (const ch of rem.slice(0, 2)) TF.handleChar(ch);
  });
  await page.waitForTimeout(50);
  await page.screenshot({ path: 'shot_fire.png' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shot_shells.png' });

  // --- 英語ボス文章のスペース挙動テスト ---
  await page.evaluate(() => { TF.G.lang = 'en'; TF.startStage(1); });
  await page.waitForTimeout(2000);
  // 雑魚をスキップしてボスへ
  await page.evaluate(() => { TF.G.remaining = 0; TF.G.enemies = []; });
  await page.waitForTimeout(2500); // bossin
  const spaceTest = await page.evaluate(() => {
    const G = TF.G;
    const boss = G.enemies.find(e => e.boss);
    if (!boss) return { fail: 'no boss' };
    G.marker = boss; if (!G.locked) TF.spaceAction();
    const word = boss.typer.word;
    const spIdx = word.indexOf(' ');
    if (spIdx < 0) return { fail: 'no space in phrase: ' + word };
    // スペース直前までタイプ
    for (let i = 0; i < spIdx; i++) TF.handleChar(word[i]);
    const before = boss.typer.idx;
    TF.spaceAction();               // 次の文字がスペース → 入力扱いのはず
    const afterSpace = { idx: boss.typer.idx, locked: G.locked };
    TF.spaceAction();               // 次は英字 → ロック解除のはず
    const afterUnlock = { locked: G.locked, sel: !!G.sel };
    return { word, before, afterSpace, afterUnlock,
      pass: afterSpace.idx === before + 1 && afterSpace.locked === true &&
            afterUnlock.locked === false && afterUnlock.sel === false };
  });

  console.log('space-in-EN test:', JSON.stringify(spaceTest));
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
  process.exit(spaceTest.pass && errors.length === 0 ? 0 : 1);
})();
