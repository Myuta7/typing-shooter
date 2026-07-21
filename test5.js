const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(require('url').pathToFileURL(require('path').join(__dirname, 'TypingShooter.html')).href);
  await page.waitForTimeout(500);

  // --- 全日本語ワードがローマ字エンジンで完走できるか検証 ---
  const wordCheck = await page.evaluate(() => {
    const bad = [];
    const all = [...WORDS_JP.flat(), ...BOSS_JP];
    for (const w of all) {
      const t = new RomaTyper(w);
      const plan = t.remain();
      let ok = true;
      for (const ch of plan) { if (!t.type(ch)) { ok = false; break; } }
      if (!(ok && t.done())) bad.push(w);
    }
    return { total: all.length, bad };
  });

  // --- 隊列テスト：新規敵は後列(slot>=3)、前列撃破で後列がせり出す ---
  await page.evaluate(() => { TF.SND.muted = true; TF.G.unlocked = 10; TF.startStage(5); });
  await page.waitForTimeout(4500);
  const spawnSlots = await page.evaluate(() => {
    // 現在の前列にいる敵は繰り上がり済みのはず。全員のslotを記録
    return TF.G.enemies.map(e => ({ slot: e.slot, x: Math.round(e.x), tx: e.tx }));
  });
  // 前列の敵を1体撃破
  const frontKilled = await page.evaluate(() => {
    const front = TF.G.enemies.find(e => e.slot < 3 && e.state === 'idle');
    if (!front) return null;
    const row = front.slot;
    const backBefore = TF.G.enemies.find(e => e.slot === row + 3);
    TF.G.marker = front; TF.spaceAction();
    let guard = 0;
    while (!front.typer.done() && guard++ < 200) {
      const c = front.typer.remain()[0];
      TF.handleChar(c);
    }
    return { row, hadBack: !!backBefore, backWord: backBefore ? backBefore.word : null };
  });
  await page.waitForTimeout(1600); // 死亡アニメ+せり出し完了待ち
  const promoted = await page.evaluate((fk) => {
    if (!fk || !fk.hadBack) return { skip: true };
    const e = TF.G.enemies.find(e => e.word === fk.backWord);
    return e ? { slot: e.slot, tx: e.tx, ok: e.slot === fk.row && e.tx === 660 } : { gone: true };
  }, frontKilled);
  await page.screenshot({ path: 'shot_formation.png' });

  const spawnOk = spawnSlots.every(s => s.tx === 660 || s.tx === 830);
  console.log('JP word coverage:', wordCheck.total, 'words, bad =', JSON.stringify(wordCheck.bad));
  console.log('formation slots:', JSON.stringify(spawnSlots));
  console.log('front killed:', JSON.stringify(frontKilled), '→ promoted:', JSON.stringify(promoted));
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
  const ok = wordCheck.bad.length === 0 && spawnOk && (promoted.skip || promoted.ok) && errors.length === 0;
  process.exit(ok ? 0 : 1);
})();
