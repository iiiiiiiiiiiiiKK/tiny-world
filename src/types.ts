/**
 * Tiny World — 核心领域类型定义
 * 所有价格、奖励、尺寸、解锁条件均来自 config/ 下的统一配置。
 */

export type ResourceKind = 'coins' | 'wood' | 'stone';

export interface Resources {
  coins: number;
  wood: number;
  stone: number;
}

export type RepeatType = 'daily' | 'weekly' | 'once' | 'custom';

export type TaskCategory =
  | 'study'
  | 'reading'
  | 'fitness'
  | 'work'
  | 'writing'
  | 'habit'
  | 'mindfulness'
  | 'social'
  | 'other';

export interface TaskReward extends Resources {
  xp: number;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  category: TaskCategory;
  repeatType: RepeatType;
  /** 0=周日 … 6=周六，仅 custom 使用 */
  repeatDays: number[];
  reward: TaskReward;
  createdAt: number;
  archived: boolean;
  /** yyyy-mm-dd，可选 */
  startDate: string | null;
  /** yyyy-mm-dd，可选 */
  dueDate: string | null;
}

export interface TaskCompletion {
  /** `${taskId}::${periodKey}`，主键天然防止同周期重复领取 */
  id: string;
  taskId: string;
  periodKey: string;
  completedAt: number;
  reward: TaskReward;
}

export interface Profile {
  id: 'me';
  cityName: string;
  createdAt: number;
  xp: number;
  level: number;
  resources: Resources;
  totalTasks: number;
  totalXp: number;
  totalCoins: number;
  streak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  /** 随机事件当日金币上限保护 */
  randomEventDate: string | null;
  randomEventCoinsToday: number;
}

export type BuildingShape =
  | 'box'
  | 'tree'
  | 'pine'
  | 'shrub'
  | 'rock'
  | 'fountain'
  | 'statue'
  | 'bench'
  | 'lamp'
  | 'road';

export interface BuildingArt {
  shape: BuildingShape;
  /** 立面像素高度 */
  height: number;
  roof: string;
  roofDark: string;
  wall: string;
  wallDark: string;
  trim: string;
  accent: string;
  style?: 'gable' | 'flat' | 'dome' | 'steep' | 'round';
  windows?: number;
  /** 屋顶附加装饰 */
  detail?: 'chimney' | 'antenna' | 'dome' | 'flag' | 'sign' | 'spire' | 'none';
}

export interface BuildingType {
  id: string;
  name: string;
  nameEn: string;
  category: 'basic' | 'growth' | 'advanced' | 'decor';
  size: { w: number; h: number };
  cost: Partial<Resources>;
  unlockLevel: number;
  maxLevel: number;
  description: string;
  art: BuildingArt;
  /** 每升一级所需资源 */
  upgradeCost: Partial<Resources>;
  /** 出售返还比例 */
  sellRatio: number;
}

export interface BuildingInstance {
  id: string;
  typeId: string;
  x: number;
  y: number;
  level: number;
  placedAt: number;
  variant: number;
}

export interface CityEvent {
  id: string;
  kind: string;
  title: string;
  body: string;
  at: number;
  reward: TaskReward | null;
}

export interface DailyRecord {
  /** yyyy-mm-dd */
  id: string;
  tasks: number;
  xp: number;
  coins: number;
  buildings: number;
}

export interface MetaRow {
  id: string;
  value: unknown;
}

export const EMPTY_RESOURCES: Resources = { coins: 0, wood: 0, stone: 0 };
