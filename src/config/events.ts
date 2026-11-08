import type { TaskReward } from '../types';

/**
 * 城市事件规则表。
 * 事件只在完成任务的瞬间触发，且受每日金币上限约束，
 * 不会用无上限随机奖励破坏经济系统。
 */

export interface EventTemplate {
  id: string;
  title: string;
  body: string;
  weight: number;
  /** 奖励上限（实际发放会被每日总上限截断） */
  reward: TaskReward;
  /** 仅在满足这些条件时才可能出现 */
  requires?: {
    minBuildings?: number;
    minLevel?: number;
    minTaskCount?: number;
  };
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'new_resident',
    title: '新居民搬入',
    body: '一位新的居民在街角安顿下来，给城市送来了一些物资。',
    weight: 10,
    reward: { coins: 12, wood: 6, stone: 2, xp: 8 },
  },
  {
    id: 'shop_opens',
    title: '新店开业',
    body: '街角挂起了新的招牌，店里飘出热腾腾的香味。',
    weight: 8,
    reward: { coins: 18, wood: 4, stone: 3, xp: 10 },
    requires: { minLevel: 2 },
  },
  {
    id: 'park_built',
    title: '公园落成',
    body: '一小片绿地出现了，孩子们在草地上跑。',
    weight: 8,
    reward: { coins: 10, wood: 10, stone: 2, xp: 8 },
    requires: { minBuildings: 4 },
  },
  {
    id: 'city_festival',
    title: '城市节日',
    body: '街道挂起了彩灯，今晚整个城市都在庆祝。',
    weight: 5,
    reward: { coins: 26, wood: 8, stone: 6, xp: 16 },
    requires: { minLevel: 3 },
  },
  {
    id: 'new_building_unlocked',
    title: '新建筑解锁',
    body: '城市的图纸上多出了一栋新的建筑，现在可以去建造了。',
    weight: 6,
    reward: { coins: 20, wood: 14, stone: 8, xp: 14 },
    requires: { minBuildings: 8 },
  },
  {
    id: 'golden_road',
    title: '铺路工人加班',
    body: '工人们连夜铺好了新的一段道路，路灯也亮了。',
    weight: 7,
    reward: { coins: 14, wood: 12, stone: 4, xp: 9 },
    requires: { minBuildings: 6 },
  },
  {
    id: 'school_report',
    title: '学校的喜报',
    body: '城市学校的孩子们拿到奖了，老师们挂起了横幅。',
    weight: 6,
    reward: { coins: 16, wood: 6, stone: 6, xp: 12 },
    requires: { minBuildings: 10 },
  },
  {
    id: 'clear_sky',
    title: '晴朗的一天',
    body: '阳光很好，什么也没发生——这也不错。',
    weight: 12,
    reward: { coins: 8, wood: 4, stone: 0, xp: 6 },
  },
  {
    id: 'artisan',
    title: '匠人来访',
    body: '一位手艺人路过，为城市添置了一些建材。',
    weight: 7,
    reward: { coins: 8, wood: 16, stone: 10, xp: 10 },
  },
  {
    id: 'supply_train',
    title: '补给车抵达',
    body: '一车物资停在了广场边，工人正在往下搬。',
    weight: 7,
    reward: { coins: 10, wood: 14, stone: 12, xp: 10 },
  },
];

export const EVENT_TOTAL_WEIGHT = EVENT_TEMPLATES.reduce((s, t) => s + t.weight, 0);
