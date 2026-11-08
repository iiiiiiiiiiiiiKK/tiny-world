import type { Resources, TaskCategory, TaskReward } from '../types';

/**
 * 统一经济系统配置。
 * 所有数值都集中在这里，组件中不允许出现硬编码价格/奖励。
 */

export const STARTING_RESOURCES: Resources = { coins: 80, wood: 100, stone: 20 };

export interface LevelDef {
  level: number;
  name: string;
  nameEn: string;
  /** 达到该等级所需的累计经验 */
  xp: number;
  /** 解锁的城市网格边长（区域随等级扩大） */
  extent: number;
  desc: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: '荒地', nameEn: 'Wasteland', xp: 0, extent: 6, desc: '一小片被遗忘的土地，等待第一座房子。' },
  { level: 2, name: '小营地', nameEn: 'Camp', xp: 120, extent: 8, desc: '几顶帐篷和一条土路，夜里也有灯火。' },
  { level: 3, name: '小村庄', nameEn: 'Village', xp: 320, extent: 10, desc: '邻居开始互相打招呼，湖边出现了凉亭。' },
  { level: 4, name: '初级城镇', nameEn: 'Town', xp: 720, extent: 12, desc: '有了商店和学校，城市开始运转。' },
  { level: 5, name: '繁荣小镇', nameEn: 'Prosperous Town', xp: 1500, extent: 14, desc: '咖啡馆排起队，广场上有人在读书。' },
  { level: 6, name: '现代城市', nameEn: 'Modern City', xp: 2800, extent: 15, desc: '办公楼亮起整面的灯，科技中心开始运转。' },
  { level: 7, name: '科技都市', nameEn: 'Tech Metropolis', xp: 5000, extent: 16, desc: '整座城市为你而建。' },
];

export const MAX_LEVEL = LEVELS.length;

export function levelFromXp(xp: number): LevelDef {
  let found = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.xp) found = l;
  }
  return found;
}

export function levelProgress(xp: number) {
  const current = levelFromXp(xp);
  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  if (!next) return { current, next: null, ratio: 1, remaining: 0 };
  const span = next.xp - current.xp;
  const done = xp - current.xp;
  return {
    current,
    next,
    ratio: Math.max(0, Math.min(1, done / span)),
    remaining: Math.max(0, next.xp - xp),
  };
}

/** 升级一级建筑带来的经验奖励 */
export const UPGRADE_XP = 15;

export const CATEGORY_META: {
  id: TaskCategory;
  name: string;
  nameEn: string;
  color: string;
  defaultReward: TaskReward;
}[] = [
  { id: 'reading', name: '阅读', nameEn: 'Reading', color: '#c8503f', defaultReward: { coins: 10, wood: 2, stone: 0, xp: 12 } },
  { id: 'study', name: '学习', nameEn: 'Study', color: '#4a7fc1', defaultReward: { coins: 15, wood: 3, stone: 1, xp: 18 } },
  { id: 'fitness', name: '运动', nameEn: 'Fitness', color: '#3aa08a', defaultReward: { coins: 12, wood: 3, stone: 0, xp: 15 } },
  { id: 'work', name: '工作', nameEn: 'Work', color: '#8b5e3c', defaultReward: { coins: 18, wood: 4, stone: 2, xp: 20 } },
  { id: 'writing', name: '写作', nameEn: 'Writing', color: '#8a63b8', defaultReward: { coins: 16, wood: 2, stone: 2, xp: 18 } },
  { id: 'habit', name: '习惯', nameEn: 'Habit', color: '#d78b3c', defaultReward: { coins: 8, wood: 2, stone: 0, xp: 10 } },
  { id: 'mindfulness', name: '休息', nameEn: 'Rest', color: '#b9bfc7', defaultReward: { coins: 6, wood: 1, stone: 0, xp: 8 } },
  { id: 'social', name: '社交', nameEn: 'Social', color: '#e0a3c0', defaultReward: { coins: 10, wood: 1, stone: 1, xp: 12 } },
  { id: 'other', name: '其他', nameEn: 'Other', color: '#8b8b8b', defaultReward: { coins: 8, wood: 2, stone: 0, xp: 10 } },
];

export function categoryMeta(id: TaskCategory) {
  return CATEGORY_META.find((c) => c.id === id) ?? CATEGORY_META[CATEGORY_META.length - 1];
}

export const REPEAT_META = [
  { id: 'daily', name: '每日', nameEn: 'Daily' },
  { id: 'weekly', name: '每周', nameEn: 'Weekly' },
  { id: 'once', name: '一次性', nameEn: 'One-off' },
  { id: 'custom', name: '自定义', nameEn: 'Custom' },
] as const;

/** 随机城市事件的每日金币上限，防止经济被随机奖励打爆 */
export const RANDOM_EVENT_DAILY_COIN_CAP = 80;

/** 随机事件触发间隔（每完成 N 个任务才可能触发一次随机事件） */
export const RANDOM_EVENT_INTERVAL = 4;

/** 升级建筑时每级售价递增系数 */
export const UPGRADE_COST_SCALE = 1.8;
