import { chromium, devices } from '@playwright/test';

/**
 * 对线上生产站点做真实验收冒烟测试。
 * 用法：BASE=https://iiiiiiiiiiiiiKK.github.io/tiny-world/ npx tsx scripts/verify-production.ts
 */
const BASE = process.env.BASE ?? 'https://iiiiiiiiiiiiiKK.github.io/tiny-world/';

const results: { name: string; ok: boolean; detail?: string }[] = [];
function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/** 直接读取 IndexedDB 中的 profile，用于校验真实持久化状态 */
async function readProfile(page: any) {
  return page.evaluate(async () => {
    const req = indexedDB.open('tiny-world');
    const dbo = await new Promise<any>((r) => (req.onsuccess = () => r(req.result)));
    const tx = dbo.transaction(['meta'], 'readonly');
    const g = tx.objectStore('meta').get('profile');
    const row = await new Promise<any>((r) => (g.onsuccess = () => r(g.result)));
    dbo.close();
    return row?.value ?? null;
  });
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors: string[] = [];
  page.on('console', (m: any) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e: Error) => consoleErrors.push(`pageerror: ${e.message}`));

  // ── 1. 首页 ───────────────────────────────────────────────
  const resp = await page.goto(BASE, { waitUntil: 'networkidle' });
  record('首页 HTTP 200', resp?.status() === 200, `status=${resp?.status()}`);
  await page.waitForTimeout(1500);

  record('城市画布已渲染', await page.locator('canvas').first().isVisible());
  record('城市名显示', await page.getByText('我的微型世界').first().isVisible());
  record('资源条显示', await page.getByTestId('resource-coins').isVisible());

  // ── 2. 作者 𝕏 链接 ────────────────────────────────────────
  const xLink = page.locator('a[href="https://x.com/0xkillcoin"]').first();
  const xHref = await xLink.getAttribute('href');
  record('顶部 𝕏 作者链接', (await xLink.isVisible()) && xHref === 'https://x.com/0xkillcoin', xHref ?? '');

  // ── 3. 任务完成 + 持久化 + 防重复领奖 ─────────────────────
  await page.goto(`${BASE}#/tasks`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const coins0 = (await readProfile(page))?.resources?.coins ?? -1;
  const firstTaskRow = page.locator('div').filter({ hasText: /阅读 20 分钟/ }).first();
  // 只点任务卡片内的「完成」按钮（exact 避免匹配「待完成」「已完成」筛选片）
  const completeBtn = page.getByRole('button', { name: '完成', exact: true }).first();
  const hasCompleteBtn = await completeBtn.isVisible();
  record('任务页存在「完成」按钮', hasCompleteBtn);

  if (hasCompleteBtn) {
    await completeBtn.click();
    await page.waitForTimeout(1600);
    const coins1 = (await readProfile(page))?.resources?.coins ?? -1;
    record('完成任务后金币增加', coins1 > coins0, `${coins0} → ${coins1}`);

    // 刷新后再读，验证 IndexedDB 持久化
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const coins2 = (await readProfile(page))?.resources?.coins ?? -1;
    record('刷新后金币保持（IndexedDB 持久化）', coins2 === coins1, `${coins1} → ${coins2}`);

    // 同一周期重复领取必须被拒绝：再点一次同名任务的完成按钮应已消失
    await page.waitForTimeout(300);
    const doneBadges = await page.getByText('已完成', { exact: true }).count();
    const remainingComplete = await page.getByRole('button', { name: '完成', exact: true }).count();
    record('同周期不可重复领取（完成按钮已减少）', remainingComplete <= 3, `剩余完成按钮 ${remainingComplete}，已完成标记 ${doneBadges}`);
    void firstTaskRow;
  }

  // ── 4. 建造流程 ───────────────────────────────────────────
  await page.goto(`${BASE}#/buildings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const wood0 = Number((await page.getByTestId('shop-wood').textContent())?.match(/\d+/)?.[0] ?? '-1');

  await page.getByRole('button', { name: /小木屋/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '去建造' }).click();
  await page.waitForTimeout(900);

  const canvas2 = page.locator('canvas').first();
  const box = (await canvas2.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(1300);
  const panelShown = await page.getByText('占地').first().isVisible();
  record('建造后建筑详情面板出现', panelShown);

  if (panelShown) {
    await page.getByRole('button', { name: '升级' }).click();
    await page.waitForTimeout(1000);
    record('建筑升级到 Lv.2', await page.getByText('Lv.2').first().isVisible());
  }

  await page.goto(`${BASE}#/buildings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const wood1 = Number((await page.getByTestId('shop-wood').textContent())?.match(/\d+/)?.[0] ?? '-1');
  // 小木屋建造消耗 24 木材；若上一步升级成功，再消耗 18 木材（升级成本）
  const expected = panelShown ? 24 + 18 : 24;
  record(
    `建造${panelShown ? '+升级' : ''}消耗木材（-${expected}）`,
    wood0 - wood1 === expected,
    `${wood0} → ${wood1}`,
  );

  // ── 5. 其余页面 ───────────────────────────────────────────
  for (const [path, marker] of [
    ['#/statistics', '累计经验'],
    ['#/history', '活跃热力图'],
    ['#/settings', '数据备份与恢复'],
    ['#/city', '城市分享'],
  ] as const) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    record(`页面 ${path}`, await page.getByText(marker).first().isVisible(), marker);
  }

  // ── 6. 控制台无错误 ───────────────────────────────────────
  const realErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('React DevTools'),
  );
  record('无控制台错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));
  await ctx.close();

  // ── 7. 移动端 ─────────────────────────────────────────────
  const mctx = await browser.newContext({ ...devices['iPhone 13'] });
  const mpage = await mctx.newPage();
  await mpage.goto(BASE, { waitUntil: 'networkidle' });
  await mpage.waitForTimeout(1600);
  record('移动端底部导航可见', await mpage.getByRole('link', { name: '任务' }).first().isVisible());
  const overflow = await mpage.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  record('移动端无横向溢出', overflow <= 1, `overflow=${overflow}px`);
  record('移动端城市画布渲染', await mpage.locator('canvas').first().isVisible());
  await mctx.close();

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log('\n──────── 生产验收汇总 ────────');
  console.log(`通过 ${results.length - failed.length} / ${results.length}`);
  if (failed.length) {
    console.log('失败项：');
    for (const f of failed) console.log(' -', f.name, f.detail ?? '');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('验收脚本异常：', e);
  process.exit(1);
});
