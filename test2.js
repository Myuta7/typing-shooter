const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(require('url').pathToFileURL(require('path').join(__dirname, 'TypingShooter.html')).href);
  await page.waitForTimeout(500);

  // ステージ7 多数敵の画面
  await page.evaluate(() => { window.TF.SND.muted = true; window.TF.G.unlocked = 10; window.TF.startStage(7); });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: 'shot_stage7.png' });

  // ゲームオーバーまで放置(ゲージ攻撃を受ける)
  const t0 = Date.now();
  let overOk = false;
  while (Date.now() - t0 < 60000) {
    const s = await page.evaluate(() => window.TF.G.scene);
    if (s === 'over') { overOk = true; break; }
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'shot_gameover.png' });

  // 英語モード + エンドレス
  await page.evaluate(() => { window.TF.G.lang = 'en'; window.TF.startEndless(); });
  await page.waitForTimeout(2300);
  // 2waveぶん自動タイプ
  const t1 = Date.now();
  let maxWave = 1;
  while (Date.now() - t1 < 40000) {
    const st = await page.evaluate(() => {
      const G = window.TF.G;
      if(!G.locked){ const t=G.enemies.filter(e=>e.state!=='die').sort((a,b)=>a.x-b.x)[0]; if(t){G.marker=t; TF.spaceAction();} }
      let target = G.sel && G.sel.state !== 'die' ? G.sel : null;
      if (!target) target = G.enemies.filter(e => e.state !== 'die').sort((a,b)=>a.x-b.x)[0] || null;
      return { wave: G.wave, rem: target ? target.typer.remain() : null, scene: G.scene, hearts: G.hearts };
    });
    maxWave = Math.max(maxWave, st.wave);
    if (st.scene !== 'play') break;
    if (st.wave >= 3) break;
    if (st.rem) for (const ch of st.rem.slice(0, 5)) await page.evaluate(c => window.TF.handleChar(c), ch); else await page.evaluate(() => { const G = TF.G; const t = G.enemies.filter(e=>e.state!=='die').sort((a,b)=>a.x-b.x)[0]; if(t){ G.marker=t; TF.spaceAction(); } });
    await page.waitForTimeout(70);
  }
  await page.screenshot({ path: 'shot_endless_en.png' });
  const misses = await page.evaluate(() => window.TF.G.miss);
  console.log('gameover shown:', overOk, '| endless wave reached:', maxWave, '| en misses:', misses);
  console.log('console errors:', JSON.stringify(errors.slice(0, 10)));
  await browser.close();
  process.exit(overOk && maxWave >= 3 && errors.length === 0 ? 0 : 1);
})();
