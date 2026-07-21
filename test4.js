const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(require('url').pathToFileURL(require('path').join(__dirname, 'TypingShooter.html')).href);
  await page.waitForTimeout(500);

  // --- タッチ誤判定シナリオ再現：hinにフォーカスした状態でF/D/Spaceが効くか ---
  await page.evaluate(() => { TF.SND.muted = true; TF.startStage(1); });
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.getElementById('hin').focus());
  const beforeMarker = await page.evaluate(() => TF.G.enemies.indexOf(TF.G.marker));
  await page.keyboard.press('f');
  const afterMarker = await page.evaluate(() => TF.G.enemies.indexOf(TF.G.marker));
  await page.keyboard.press(' ');
  const lockedWithFocus = await page.evaluate(() => TF.G.locked);
  // ロック中にタイプできるか(hinフォーカスのまま)
  const rem = await page.evaluate(() => TF.G.sel ? TF.G.sel.typer.remain() : '');
  if (rem) await page.keyboard.press(rem[0]);
  const hitsWithFocus = await page.evaluate(() => TF.G.hits);
  const focusTest = lockedWithFocus && hitsWithFocus > 0;

  // --- エンドレス：wave5でボスが出るか ---
  await page.evaluate(() => { TF.startEndless(); });
  await page.waitForTimeout(2000);
  let bossAtWave5 = false, maxWave = 1, bossKilled = false, waveAfterBoss = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const st = await page.evaluate(() => {
      const G = TF.G;
      if (!G.locked) {
        const t = G.enemies.filter(e => e.state !== 'die').sort((a, b) => a.x - b.x)[0];
        if (t) { G.marker = t; TF.spaceAction(); }
      }
      return {
        scene: G.scene, wave: G.wave, state: G.state,
        rem: G.sel ? G.sel.typer.remain() : null,
        hasBoss: G.enemies.some(e => e.boss),
      };
    });
    maxWave = Math.max(maxWave, st.wave);
    if (st.scene !== 'play') break;
    if (st.wave === 5 && st.hasBoss) bossAtWave5 = true;
    if (bossAtWave5 && st.wave > 5) { bossKilled = true; waveAfterBoss = st.wave; break; }
    if (st.rem) for (const ch of st.rem.slice(0, 6)) await page.evaluate(c => TF.handleChar(c), ch);
    await page.waitForTimeout(60);
  }
  await page.screenshot({ path: 'shot_endless_boss.png' });

  console.log('focus-immune keys:', focusTest, JSON.stringify({ beforeMarker, afterMarker, lockedWithFocus, hitsWithFocus }));
  console.log('endless: bossAtWave5 =', bossAtWave5, '| boss killed, continued to wave', waveAfterBoss, '| maxWave', maxWave);
  console.log('errors:', JSON.stringify(errors));
  await browser.close();
  process.exit(focusTest && bossAtWave5 && bossKilled && errors.length === 0 ? 0 : 1);
})();
