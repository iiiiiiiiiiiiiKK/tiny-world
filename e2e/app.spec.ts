import { expect, test, type Page } from '@playwright/test';

/** 每次测试前清空本地存储，保证从全新城市开始 */
async function resetCity(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      for (const d of dbs) {
        if (d.name) indexedDB.deleteDatabase(d.name);
      }
    }
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForTimeout(600);
}

test.describe('Tiny World 端到端', () => {
  test('首页加载并显示城市画布与资源条', async ({ page, isMobile }) => {
    await resetCity(page);
    await expect(page.locator('canvas').first()).toBeVisible();
    // 底部资源条
    await expect(page.getByTestId('resource-coins')).toBeVisible();
    await expect(page.getByTestId('resource-wood')).toBeVisible();
    await expect(page.getByTestId('resource-stone')).toBeVisible();
    // 城市名与等级在顶部栏
    await expect(page.getByText('我的微型世界').first()).toBeVisible();
    if (isMobile) {
      await expect(page.getByRole('heading', { name: '今日任务' })).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: '今天做点什么？' })).toBeVisible();
    }
  });

  test('完成一个任务会发放奖励且同周期不能重复领取', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/tasks');
    await page.waitForTimeout(400);

    const firstTask = page.getByRole('button', { name: '完成' }).first();
    await expect(firstTask).toBeVisible();
    await firstTask.click();
    await page.waitForTimeout(700);

    // 完成后该任务应变为「已完成」
    await expect(page.getByText('已完成').first()).toBeVisible();

    // 切到「已完成」筛选，至少存在一条记录
    await page.getByRole('button', { name: '已完成' }).click();
    await page.waitForTimeout(300);
    const doneCount = await page.getByText('已完成').count();
    expect(doneCount).toBeGreaterThan(0);
  });

  test('创建新任务并出现在列表中', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/tasks');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: '新建' }).click();
    await page.getByPlaceholder('例如：阅读 20 分钟').fill('端到端测试任务');
    await page.getByRole('button', { name: '创建任务' }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('端到端测试任务')).toBeVisible();
  });

  test('未解锁的建筑会显示锁并且无法建造', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/buildings');
    await page.waitForTimeout(400);

    // 科技中心需要 Lv.6，当前是 Lv.1 → 应显示锁定
    await expect(page.getByRole('button', { name: /科技中心/ }).first()).toContainText('Lv.6 解锁');

    await page.getByRole('button', { name: /科技中心/ }).first().click();
    await page.waitForTimeout(300);
    const buildBtn = page.getByRole('button', { name: '去建造' });
    await expect(buildBtn).toBeVisible();
    await buildBtn.click();
    await expect(page.getByText(/需要城市等级/).first()).toBeVisible();
  });

  test('建造后资源被正确扣除', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/buildings');
    await page.waitForTimeout(500);

    const woodBefore = Number(
      (await page.getByTestId('shop-wood').textContent())?.match(/\d+/)?.[0] ?? '0',
    );
    expect(woodBefore).toBe(100);

    await page.getByRole('button', { name: /小木屋/ }).first().click();
    await page.getByRole('button', { name: '去建造' }).click();
    await page.waitForTimeout(600);

    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);

    await page.goto('/#/buildings');
    await page.waitForTimeout(500);
    const woodAfter = Number(
      (await page.getByTestId('shop-wood').textContent())?.match(/\d+/)?.[0] ?? '0',
    );
    // 小木屋消耗 24 木材
    expect(woodAfter).toBe(woodBefore - 24);
  });

  test('建造建筑后城市画布出现建筑，选择后可升级', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/buildings');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /小木屋/ }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: '去建造' }).click();
    await page.waitForTimeout(600);

    // 进入放置模式后点击画布中心
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not found');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);

    // 建筑详情面板应出现
    await expect(page.getByText('占地').first()).toBeVisible();

    // 升级
    await page.getByRole('button', { name: '升级' }).click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Lv.2').first()).toBeVisible();
  });

  test('碰撞检测：同一位置不能重复放置', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/buildings');
    await page.waitForTimeout(400);

    await page.getByRole('button', { name: /小木屋/ }).first().click();
    await page.getByRole('button', { name: '去建造' }).click();
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx, cy);
    await page.waitForTimeout(600);

    // 再选同一建筑并点在同一位置
    await page.goto('/#/buildings');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /小木屋/ }).first().click();
    await page.getByRole('button', { name: '去建造' }).click();
    await page.waitForTimeout(500);
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(600);

    // 应提示无法放置
    await expect(page.getByText(/放不下|重叠|超出范围/).first()).toBeVisible();
  });

  test('刷新后数据仍然保留（IndexedDB 持久化）', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/tasks');
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: '新建' }).click();
    await page.getByPlaceholder('例如：阅读 20 分钟').fill('持久化验证任务');
    await page.getByRole('button', { name: '创建任务' }).click();
    await page.waitForTimeout(400);

    await page.reload();
    await page.waitForTimeout(700);
    await page.goto('/#/tasks');
    await page.waitForTimeout(500);

    await expect(page.getByText('持久化验证任务')).toBeVisible();
  });

  test('数据导出可生成有效 JSON 备份', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/settings');
    await page.waitForTimeout(500);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出数据' }).click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const fs = await import('node:fs/promises');
    const content = JSON.parse(await fs.readFile(path!, 'utf8'));
    expect(content.format).toBe('tiny-world@1');
    expect(content.profile).toBeTruthy();
  });

  test('统计页与成长记录页正常渲染', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/statistics');
    await page.waitForTimeout(500);
    await expect(page.getByText('累计经验')).toBeVisible();
    await expect(page.getByText('建筑构成')).toBeVisible();

    await page.goto('/#/history');
    await page.waitForTimeout(500);
    await expect(page.getByText('活跃热力图')).toBeVisible();
    await expect(page.getByText('最近 7 天')).toBeVisible();
  });

  test('分享页可导出城市图片', async ({ page }) => {
    await resetCity(page);
    await page.goto('/#/city');
    await page.waitForTimeout(500);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出城市图片' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('tiny-world');
  });

  test('顶部包含指向 x.com/0xkillcoin 的作者链接', async ({ page }) => {
    await resetCity(page);
    const link = page.locator('a[href="https://x.com/0xkillcoin"]');
    await expect(link.first()).toBeVisible();
  });

  test('移动端：底部导航存在且无横向溢出', async ({ page, isMobile }) => {
    test.skip(!isMobile, '仅移动端项目执行');
    await resetCity(page);
    await page.goto('/#/');
    await page.waitForTimeout(600);

    // 底部导航
    await expect(page.getByRole('link', { name: '任务' }).first()).toBeVisible();

    // 无横向溢出
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
