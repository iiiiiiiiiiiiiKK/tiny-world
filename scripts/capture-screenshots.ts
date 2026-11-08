import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '..', 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:47311';

async function shot(page, name: string) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) });
  console.log('saved', name);
}

async function bootstrap(page: any) {
  // 直接写入 IndexedDB，构造一座有内容的城市用于截图
  await page.goto(BASE);
  await page.evaluate(async () => {
    const open = indexedDB.open('tiny-world');
    await new Promise<void>((resolve, reject) => {
      open.onsuccess = () => resolve();
      open.onerror = () => reject(open.error);
    });
    const db = open.result;
    const tx = db.transaction(['meta'], 'readwrite');
    const store = tx.objectStore('meta');
    const now = Date.now();
    store.put({
      id: 'profile',
      value: {
        id: 'me',
        cityName: '我的微型世界',
        createdAt: now - 86400000 * 46,
        xp: 860,
        level: 4,
        resources: { coins: 412, wood: 268, stone: 143 },
        totalTasks: 37,
        totalXp: 1240,
        totalCoins: 1890,
        streak: 6,
        bestStreak: 11,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        randomEventDate: null,
        randomEventCoinsToday: 0,
      },
    });
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  });
}

async function seedCity(page: any) {
  await page.evaluate(async () => {
    const open = indexedDB.open('tiny-world');
    await new Promise<void>((resolve) => {
      open.onsuccess = () => resolve();
      open.onerror = () => resolve();
    });
    const db = open.result;
    const tx = db.transaction(['buildings'], 'readwrite');
    const store = tx.objectStore('buildings');
    const now = Date.now();
    const buildings = [
      { id: 'b1', typeId: 'cabin', x: 3, y: 2, level: 2, placedAt: now, variant: 0 },
      { id: 'b2', typeId: 'house', x: 4, y: 3, level: 1, placedAt: now, variant: 1 },
      { id: 'b3', typeId: 'house', x: 2, y: 4, level: 3, placedAt: now, variant: 2 },
      { id: 'b4', typeId: 'tree', x: 5, y: 2, level: 1, placedAt: now, variant: 0 },
      { id: 'b5', typeId: 'tree', x: 1, y: 2, level: 1, placedAt: now, variant: 1 },
      { id: 'b6', typeId: 'pine', x: 6, y: 5, level: 1, placedAt: now, variant: 0 },
      { id: 'b7', typeId: 'road', x: 3, y: 5, level: 1, placedAt: now, variant: 0 },
      { id: 'b8', typeId: 'road', x: 4, y: 5, level: 1, placedAt: now, variant: 0 },
      { id: 'b9', typeId: 'road', x: 5, y: 5, level: 1, placedAt: now, variant: 0 },
      { id: 'b10', typeId: 'lamp', x: 3, y: 6, level: 1, placedAt: now, variant: 0 },
      { id: 'b11', typeId: 'shop', x: 5, y: 3, level: 2, placedAt: now, variant: 0 },
      { id: 'b12', typeId: 'park', x: 1, y: 6, level: 1, placedAt: now, variant: 0 },
      { id: 'b13', typeId: 'library', x: 6, y: 6, level: 1, placedAt: now, variant: 0 },
      { id: 'b14', typeId: 'school', x: 1, y: 8, level: 1, placedAt: now, variant: 0 },
      { id: 'b15', typeId: 'cafe', x: 3, y: 8, level: 1, placedAt: now, variant: 0 },
      { id: 'b16', typeId: 'shrub', x: 4, y: 2, level: 1, placedAt: now, variant: 0 },
      { id: 'b17', typeId: 'bench', x: 2, y: 7, level: 1, placedAt: now, variant: 0 },
      { id: 'b18', typeId: 'rock', x: 7, y: 3, level: 1, placedAt: now, variant: 0 },
      { id: 'b19', typeId: 'gym', x: 5, y: 8, level: 1, placedAt: now, variant: 0 },
      { id: 'b20', typeId: 'fountain', x: 2, y: 5, level: 1, placedAt: now, variant: 0 },
    ];
    for (const b of buildings) store.put(b);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  });
}

async function main() {
  const browser = await chromium.launch();

  // 桌面端
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) for (const d of dbs) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.waitForTimeout(800);
  await bootstrap(page);
  await seedCity(page);
  await page.reload();
  await page.waitForTimeout(1200);
  await shot(page, 'city-desktop');

  await page.goto(`${BASE}/#/tasks`);
  await page.waitForTimeout(700);
  await shot(page, 'tasks-desktop');

  await page.goto(`${BASE}/#/buildings`);
  await page.waitForTimeout(700);
  await shot(page, 'shop-desktop');

  await page.goto(`${BASE}/#/statistics`);
  await page.waitForTimeout(700);
  await shot(page, 'statistics-desktop');

  await page.goto(`${BASE}/#/history`);
  await page.waitForTimeout(700);
  await shot(page, 'history-desktop');

  await page.goto(`${BASE}/#/city`);
  await page.waitForTimeout(900);
  await shot(page, 'share-desktop');

  await page.goto(`${BASE}/#/settings`);
  await page.waitForTimeout(700);
  await shot(page, 'settings-desktop');

  await ctx.close();

  // 移动端
  const mctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 3 });
  const mpage = await mctx.newPage();
  await mpage.goto(BASE);
  await mpage.waitForTimeout(1000);
  await shot(mpage, 'city-mobile');
  await mpage.goto(`${BASE}/#/tasks`);
  await mpage.waitForTimeout(700);
  await shot(mpage, 'tasks-mobile');
  await mctx.close();

  await browser.close();
  console.log('screenshots done →', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
