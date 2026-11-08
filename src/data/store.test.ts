import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { useStore } from '../store/useStore';
import { toDateKey, periodKey } from '../lib/date';
import { buildingType } from '../config/buildings';

async function freshStore() {
  await db.delete();
  await db.open();
  useStore.setState({
    ready: false,
    profile: null as never,
    tasks: [],
    completions: [],
    buildings: [],
    events: [],
    daily: [],
    past: [],
    future: [],
    selectedBuildingId: null,
    placingTypeId: null,
    toast: null,
  });
  await useStore.getState().init();
}

describe('task lifecycle', () => {
  it('creates a task and persists it', async () => {
    await freshStore();
    const before = useStore.getState().tasks.length;
    await useStore.getState().createTask({
      name: '测试任务',
      description: '',
      category: 'reading',
      repeatType: 'daily',
      repeatDays: [],
      reward: { coins: 10, wood: 2, stone: 0, xp: 12 },
      startDate: null,
      dueDate: null,
    });
    expect(useStore.getState().tasks.length).toBe(before + 1);
    const stored = await db.tasks.toArray();
    expect(stored.some((t) => t.name === '测试任务')).toBe(true);
  });

  it('completing a task grants rewards exactly once per period', async () => {
    await freshStore();
    await useStore.getState().createTask({
      name: '每日阅读',
      description: '',
      category: 'reading',
      repeatType: 'daily',
      repeatDays: [],
      reward: { coins: 10, wood: 2, stone: 0, xp: 12 },
      startDate: null,
      dueDate: null,
    });
    const task = useStore.getState().tasks.find((t) => t.name === '每日阅读')!;
    const coinsBefore = useStore.getState().profile.resources.coins;
    const xpBefore = useStore.getState().profile.xp;

    const first = await useStore.getState().completeTask(task.id);
    expect(first.ok).toBe(true);

    const coinsAfter = useStore.getState().profile.resources.coins;
    const xpAfter = useStore.getState().profile.xp;
    expect(coinsAfter).toBeGreaterThanOrEqual(coinsBefore + 10);
    expect(xpAfter).toBeGreaterThanOrEqual(xpBefore + 12);

    // 第二次领取必须被拒绝
    const second = await useStore.getState().completeTask(task.id);
    expect(second.ok).toBe(false);
    expect(useStore.getState().profile.resources.coins).toBe(coinsAfter);
    expect(useStore.getState().profile.xp).toBe(xpAfter);
  });

  it('completion record key encodes the period', async () => {
    await freshStore();
    await useStore.getState().createTask({
      name: '周期测试',
      description: '',
      category: 'study',
      repeatType: 'daily',
      repeatDays: [],
      reward: { coins: 5, wood: 0, stone: 0, xp: 5 },
      startDate: null,
      dueDate: null,
    });
    const task = useStore.getState().tasks.find((t) => t.name === '周期测试')!;
    await useStore.getState().completeTask(task.id);
    const today = toDateKey();
    const expected = `${task.id}::${periodKey('daily', today)}`;
    expect(useStore.getState().completions.some((c) => c.id === expected)).toBe(true);
    expect(await db.completions.get(expected)).toBeDefined();
  });

  it('deleting a task removes its completion records', async () => {
    await freshStore();
    await useStore.getState().createTask({
      name: '待删除',
      description: '',
      category: 'habit',
      repeatType: 'once',
      repeatDays: [],
      reward: { coins: 5, wood: 0, stone: 0, xp: 5 },
      startDate: null,
      dueDate: null,
    });
    const task = useStore.getState().tasks.find((t) => t.name === '待删除')!;
    await useStore.getState().completeTask(task.id);
    await useStore.getState().deleteTask(task.id);
    expect(useStore.getState().tasks.some((t) => t.id === task.id)).toBe(false);
    expect(useStore.getState().completions.some((c) => c.taskId === task.id)).toBe(false);
    expect((await db.completions.where('taskId').equals(task.id).count())).toBe(0);
  });
});

describe('building lifecycle', () => {
  it('rejects placement when resources are insufficient', async () => {
    await freshStore();
    // 起始资源不足以建造科技中心
    const r = await useStore.getState().placeBuilding('tech', 0, 0);
    expect(r.ok).toBe(false);
    expect(r.message).toContain('资源不足');
    expect(useStore.getState().buildings).toHaveLength(0);
  });

  it('builds when resources suffice and deducts cost', async () => {
    await freshStore();
    const before = useStore.getState().profile.resources;
    const r = await useStore.getState().placeBuilding('cabin', 1, 1);
    expect(r.ok).toBe(true);
    expect(useStore.getState().buildings).toHaveLength(1);
    const after = useStore.getState().profile.resources;
    expect(after.wood).toBe(before.wood - 24);
    expect(after.coins).toBe(before.coins - 6);
  });

  it('rejects overlapping placement', async () => {
    await freshStore();
    await useStore.getState().placeBuilding('cabin', 1, 1);
    const r = await useStore.getState().placeBuilding('cabin', 1, 1);
    expect(r.ok).toBe(false);
    expect(useStore.getState().buildings).toHaveLength(1);
  });

  it('upgrades a building and spends resources', async () => {
    await freshStore();
    await useStore.getState().placeBuilding('cabin', 0, 0);
    const b = useStore.getState().buildings[0];
    const woodBefore = useStore.getState().profile.resources.wood;
    const r = await useStore.getState().upgradeBuilding(b.id);
    expect(r.ok).toBe(true);
    expect(useStore.getState().buildings[0].level).toBe(2);
    expect(useStore.getState().profile.resources.wood).toBeLessThan(woodBefore);
  });

  it('moving a building works and invalid positions are rejected', async () => {
    await freshStore();
    await useStore.getState().placeBuilding('cabin', 0, 0);
    const b = useStore.getState().buildings[0];
    const ok = await useStore.getState().moveBuilding(b.id, 3, 3);
    expect(ok.ok).toBe(true);
    expect(useStore.getState().buildings[0].x).toBe(3);

    await useStore.getState().placeBuilding('cabin', 0, 0);
    const bad = await useStore.getState().moveBuilding(b.id, 0, 0);
    expect(bad.ok).toBe(false);
  });

  it('selling a building refunds part of the cost', async () => {
    await freshStore();
    await useStore.getState().placeBuilding('cabin', 0, 0);
    const afterBuild = useStore.getState().profile.resources.coins;
    const b = useStore.getState().buildings[0];
    const r = await useStore.getState().sellBuilding(b.id);
    expect(r.ok).toBe(true);
    expect(useStore.getState().buildings).toHaveLength(0);
    // 返还额应大于 0 且小于建造花费
    expect(useStore.getState().profile.resources.coins).toBeGreaterThan(afterBuild);
    expect(useStore.getState().profile.resources.coins).toBeLessThan(
      afterBuild + (buildingType('cabin')!.cost.coins ?? 0),
    );
  });

  it('undo and redo restore layout state', async () => {
    await freshStore();
    await useStore.getState().placeBuilding('cabin', 0, 0);
    expect(useStore.getState().buildings).toHaveLength(1);
    useStore.getState().undo();
    expect(useStore.getState().buildings).toHaveLength(0);
    useStore.getState().redo();
    expect(useStore.getState().buildings).toHaveLength(1);
  });
});

describe('data export / import', () => {
  it('round-trips the whole city', async () => {
    await freshStore();
    await useStore.getState().createTask({
      name: '导出测试',
      description: 'x',
      category: 'work',
      repeatType: 'daily',
      repeatDays: [],
      reward: { coins: 20, wood: 4, stone: 2, xp: 20 },
      startDate: null,
      dueDate: null,
    });
    await useStore.getState().placeBuilding('cabin', 2, 2);
    await useStore.getState().renameCity('测试之城');

    const json = await useStore.getState().exportData();
    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('tiny-world@1');
    expect(parsed.profile.cityName).toBe('测试之城');
    expect(parsed.buildings).toHaveLength(1);
    expect(parsed.tasks).toHaveLength(useStore.getState().tasks.length);

    // 清空后再恢复
    await db.buildings.clear();
    const r = await useStore.getState().importData(json);
    expect(r.ok).toBe(true);
    expect(useStore.getState().profile.cityName).toBe('测试之城');
    expect(useStore.getState().buildings).toHaveLength(1);
  });

  it('rejects malformed import payloads', async () => {
    await freshStore();
    const r1 = await useStore.getState().importData('not json');
    expect(r1.ok).toBe(false);
    const r2 = await useStore.getState().importData('{"format":"other"}');
    expect(r2.ok).toBe(false);
  });
});
