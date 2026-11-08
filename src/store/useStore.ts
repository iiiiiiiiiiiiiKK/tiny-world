import { create } from 'zustand';
import type {
  BuildingInstance,
  CityEvent,
  DailyRecord,
  Profile,
  Resources,
  Task,
  TaskCompletion,
  TaskReward,
} from '../types';
import { db } from '../data/db';
import {
  EMPTY_RESOURCES,
} from '../types';
import {
  LEVELS,
  RANDOM_EVENT_DAILY_COIN_CAP,
  RANDOM_EVENT_INTERVAL,
  STARTING_RESOURCES,
  UPGRADE_XP,
  levelFromXp,
} from '../config/economy';
import { EVENT_TEMPLATES } from '../config/events';
import { buildingType } from '../config/buildings';
import {
  addResources,
  canPlace,
  conflictsWith,
  sellValue,
  subtractResources,
  upgradeCostFor,
} from '../lib/grid';
import { addDays, periodKey, toDateKey } from '../lib/date';

const PROFILE_ID = 'me';

export interface LayoutAction {
  label: string;
  /** 变更前快照 */
  before: BuildingInstance[];
  after: BuildingInstance[];
}

interface StoreState {
  ready: boolean;
  profile: Profile;
  tasks: Task[];
  completions: TaskCompletion[];
  buildings: BuildingInstance[];
  events: CityEvent[];
  daily: DailyRecord[];
  past: LayoutAction[];
  future: LayoutAction[];
  /** 当前打开的建筑详情面板 */
  selectedBuildingId: string | null;
  /** 建造模式中待放置的建筑类型 */
  placingTypeId: string | null;
  toast: { id: number; text: string; kind: 'ok' | 'error' | 'info' } | null;

  init: () => Promise<void>;
  resetAll: () => Promise<void>;

  setToast: (text: string, kind?: 'ok' | 'error' | 'info') => void;
  clearToast: () => void;

  createTask: (input: Omit<Task, 'id' | 'createdAt' | 'archived'>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<{ ok: boolean; message: string; reward?: TaskReward; event?: CityEvent }>;
  undoTask: (completionId: string) => Promise<void>;

  placeBuilding: (typeId: string, x: number, y: number) => Promise<{ ok: boolean; message: string }>;
  moveBuilding: (id: string, x: number, y: number) => Promise<{ ok: boolean; message: string }>;
  upgradeBuilding: (id: string) => Promise<{ ok: boolean; message: string }>;
  sellBuilding: (id: string) => Promise<{ ok: boolean; message: string }>;
  selectBuilding: (id: string | null) => void;
  setPlacing: (typeId: string | null) => void;
  undo: () => void;
  redo: () => void;

  renameCity: (name: string) => Promise<void>;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<{ ok: boolean; message: string }>;
}

function defaultProfile(): Profile {
  return {
    id: PROFILE_ID,
    cityName: '我的微型世界',
    createdAt: Date.now(),
    xp: 0,
    level: 1,
    resources: { ...STARTING_RESOURCES },
    totalTasks: 0,
    totalXp: 0,
    totalCoins: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    randomEventDate: null,
    randomEventCoinsToday: 0,
  };
}

const DEFAULT_TASKS: Omit<Task, 'id' | 'createdAt' | 'archived'>[] = [
  {
    name: '阅读 20 分钟',
    description: '任何书都算，纸质或电子。',
    category: 'reading',
    repeatType: 'daily',
    repeatDays: [],
    reward: { coins: 10, wood: 2, stone: 0, xp: 12 },
    startDate: null,
    dueDate: null,
  },
  {
    name: '英语学习 30 分钟',
    description: '背单词、听力、开口说都算。',
    category: 'study',
    repeatType: 'daily',
    repeatDays: [],
    reward: { coins: 15, wood: 3, stone: 1, xp: 18 },
    startDate: null,
    dueDate: null,
  },
  {
    name: '完成一次运动',
    description: '跑步、健身、散步、骑行都算。',
    category: 'fitness',
    repeatType: 'daily',
    repeatDays: [],
    reward: { coins: 12, wood: 3, stone: 0, xp: 15 },
    startDate: null,
    dueDate: null,
  },
];

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 随机事件抽取：受条件与每日金币上限约束 */
function pickEvent(ctx: {
  level: number;
  buildingCount: number;
  taskCount: number;
  coinsLeft: number;
}): { title: string; body: string; reward: TaskReward } | null {
  const pool = EVENT_TEMPLATES.filter((t) => {
    const r = t.requires;
    if (!r) return true;
    if (r.minLevel !== undefined && ctx.level < r.minLevel) return false;
    if (r.minBuildings !== undefined && ctx.buildingCount < r.minBuildings) return false;
    if (r.minTaskCount !== undefined && ctx.taskCount < r.minTaskCount) return false;
    return true;
  });
  if (pool.length === 0) return null;

  const total = pool.reduce((s, t) => s + t.weight, 0);
  let roll = Math.random() * total;
  let chosen = pool[0];
  for (const t of pool) {
    roll -= t.weight;
    if (roll <= 0) {
      chosen = t;
      break;
    }
  }

  const scale = ctx.coinsLeft <= 0 ? 0 : 1;
  if (scale === 0) {
    // 金币已达上限时，仍给予非金币资源与经验
    return {
      title: chosen.title,
      body: chosen.body,
      reward: {
        coins: 0,
        wood: Math.max(1, Math.floor((chosen.reward.wood ?? 0) / 2)),
        stone: Math.max(1, Math.floor((chosen.reward.stone ?? 0) / 2)),
        xp: chosen.reward.xp,
      },
    };
  }
  return { title: chosen.title, body: chosen.body, reward: chosen.reward };
}

export const useStore = create<StoreState>((set, get) => ({
  ready: false,
  profile: defaultProfile(),
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

  async init() {
    let profile = await db.meta.get('profile');
    if (!profile) {
      const p = defaultProfile();
      await db.meta.put({ id: 'profile', value: p });
      profile = { id: 'profile', value: p };
    }
    const p = profile.value as Profile;

    const tasks = await db.tasks.toArray();
    const completions = await db.completions.toArray();
    const buildings = await db.buildings.toArray();
    const events = await db.events.orderBy('at').reverse().limit(60).toArray();
    const daily = await db.daily.toArray();

    // 首次使用：写入默认任务
    if (tasks.length === 0) {
      const seeded = DEFAULT_TASKS.map((t) => ({
        ...t,
        id: uid('task'),
        createdAt: Date.now(),
        archived: false,
      }));
      await db.tasks.bulkAdd(seeded);
      set({ tasks: seeded });
    }

    set({
      ready: true,
      profile: p,
      tasks: tasks.length ? tasks : get().tasks,
      completions,
      buildings,
      events,
      daily,
    });
  },

  async resetAll() {
    await db.transaction('rw', db.tables, async () => {
      await db.tasks.clear();
      await db.completions.clear();
      await db.buildings.clear();
      await db.events.clear();
      await db.daily.clear();
      await db.meta.clear();
    });
    const p = defaultProfile();
    await db.meta.put({ id: 'profile', value: p });
    set({
      profile: p,
      tasks: [],
      completions: [],
      buildings: [],
      events: [],
      daily: [],
      past: [],
      future: [],
      selectedBuildingId: null,
      placingTypeId: null,
    });
    await get().init();
  },

  setToast(text, kind = 'info') {
    set({ toast: { id: Date.now(), text, kind } });
  },
  clearToast() {
    set({ toast: null });
  },

  async createTask(input) {
    const task: Task = {
      ...input,
      id: uid('task'),
      createdAt: Date.now(),
      archived: false,
    };
    await db.tasks.add(task);
    set((s) => ({ tasks: [...s.tasks, task] }));
  },

  async updateTask(id, patch) {
    const next = { ...patch };
    await db.tasks.update(id, next);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...next } : t)),
    }));
  },

  async deleteTask(id) {
    await db.transaction('rw', [db.tasks, db.completions], async () => {
      await db.tasks.delete(id);
      await db.completions.where('taskId').equals(id).delete();
    });
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      completions: s.completions.filter((c) => c.taskId !== id),
    }));
  },

  async completeTask(taskId) {
    const s = get();
    const task = s.tasks.find((t) => t.id === taskId);
    if (!task) return { ok: false, message: '任务不存在' };

    const today = toDateKey();
    const pk = periodKey(task.repeatType, today, task.repeatDays);
    const cid = `${taskId}::${pk}`;

    // 幂等检查：同一周期只发放一次奖励
    const existing = await db.completions.get(cid);
    if (existing) {
      return { ok: false, message: '这一轮已经完成过了，明天再来吧' };
    }

    let event: CityEvent | undefined;

    // 原子操作：奖励发放 + 任务状态 + 经验 + 日统计 + 事件，全部在同一个事务内
    await db.transaction(
      'rw',
      [db.completions, db.meta, db.daily, db.events],
      async () => {
        const dup = await db.completions.get(cid);
        if (dup) throw new Error('DUPLICATE');

        const prof = s.profile;
        const reward = task.reward;

        // 随机事件判定：每 N 个任务触发一次，且受每日金币上限
        let nextEvent: CityEvent | undefined;
        const triggerCount = prof.totalTasks + 1;
        if (triggerCount % RANDOM_EVENT_INTERVAL === 0) {
          const todayKey = toDateKey();
          const coinsToday =
            prof.randomEventDate === todayKey ? prof.randomEventCoinsToday : 0;
          const coinsLeft = Math.max(0, RANDOM_EVENT_DAILY_COIN_CAP - coinsToday);
          const picked = pickEvent({
            level: prof.level,
            buildingCount: s.buildings.length,
            taskCount: prof.totalTasks,
            coinsLeft,
          });
          if (picked) {
            nextEvent = {
              id: uid('evt'),
              kind: 'random',
              title: picked.title,
              body: picked.body,
              at: Date.now(),
              reward: picked.reward,
            };
          }
        }

        const bonus = nextEvent?.reward ?? { coins: 0, wood: 0, stone: 0, xp: 0 };
        const totalGain: Resources = {
          coins: reward.coins + bonus.coins,
          wood: reward.wood + bonus.wood,
          stone: reward.stone + bonus.stone,
        };
        const totalXp = reward.xp + bonus.xp;

        const newXp = prof.xp + totalXp;
        const newLevel = levelFromXp(newXp).level;

        // 连续活跃天数：今天做过则不重复累加
        let streak = prof.streak;
        let bestStreak = prof.bestStreak;
        let lastActiveDate = prof.lastActiveDate;
        if (lastActiveDate !== today) {
          const yesterday = addDays(today, -1);
          streak = lastActiveDate === yesterday ? streak + 1 : 1;
          lastActiveDate = today;
          bestStreak = Math.max(bestStreak, streak);
        }

        const nextProfile: Profile = {
          ...prof,
          xp: newXp,
          level: newLevel,
          resources: addResources(prof.resources, totalGain),
          totalTasks: prof.totalTasks + 1,
          totalXp: prof.totalXp + totalXp,
          totalCoins: prof.totalCoins + totalGain.coins,
          streak,
          bestStreak,
          lastActiveDate,
          randomEventDate:
            nextEvent && nextEvent.reward
              ? prof.randomEventDate === today
                ? today
                : today
              : prof.randomEventDate,
          randomEventCoinsToday:
            nextEvent && nextEvent.reward
              ? (prof.randomEventDate === today ? prof.randomEventCoinsToday : 0) +
                (nextEvent.reward.coins ?? 0)
              : prof.randomEventCoinsToday,
        };

        const completion: TaskCompletion = {
          id: cid,
          taskId,
          periodKey: pk,
          completedAt: Date.now(),
          reward: { ...reward, xp: totalXp },
        };

        const rec = await db.daily.get(today);
        const dailyRec: DailyRecord = rec
          ? {
              ...rec,
              tasks: rec.tasks + 1,
              xp: rec.xp + totalXp,
              coins: rec.coins + totalGain.coins,
            }
          : {
              id: today,
              tasks: 1,
              xp: totalXp,
              coins: totalGain.coins,
              buildings: 0,
              };

        await db.completions.add(completion);
        await db.meta.put({ id: 'profile', value: nextProfile });
        await db.daily.put(dailyRec);
        if (nextEvent) await db.events.add(nextEvent);

        set((st) => ({
          profile: nextProfile,
          completions: [...st.completions, completion],
          daily: st.daily.some((d) => d.id === dailyRec.id)
            ? st.daily.map((d) => (d.id === dailyRec.id ? dailyRec : d))
            : [...st.daily, dailyRec],
          events: nextEvent ? [nextEvent, ...st.events] : st.events,
        }));
        event = nextEvent;
      },
    );

    const levelUp = get().profile.level;
    return {
      ok: true,
      message: '完成！城市又亮了一点',
      reward: task.reward,
      event,
      ...(levelUp ? {} : {}),
    };
  },

  async undoTask(completionId) {
    const s = get();
    const c = s.completions.find((x) => x.id === completionId);
    if (!c) return;
    await db.transaction('rw', [db.completions, db.meta, db.daily], async () => {
      const prof = s.profile;
      const nextXp = Math.max(0, prof.xp - (c.reward.xp ?? 0));
      const nextProfile: Profile = {
        ...prof,
        xp: nextXp,
        level: levelFromXp(nextXp).level,
        resources: {
          coins: Math.max(0, prof.resources.coins - (c.reward.coins ?? 0)),
          wood: Math.max(0, prof.resources.wood - (c.reward.wood ?? 0)),
          stone: Math.max(0, prof.resources.stone - (c.reward.stone ?? 0)),
        },
        totalTasks: Math.max(0, prof.totalTasks - 1),
        totalXp: Math.max(0, prof.totalXp - (c.reward.xp ?? 0)),
        totalCoins: Math.max(0, prof.totalCoins - (c.reward.coins ?? 0)),
      };
      await db.completions.delete(completionId);
      await db.meta.put({ id: 'profile', value: nextProfile });

      const day = toDateKey(c.completedAt);
      const d = await db.daily.get(day);
      if (d) {
        await db.daily.put({
          ...d,
          tasks: Math.max(0, d.tasks - 1),
          xp: Math.max(0, d.xp - (c.reward.xp ?? 0)),
          coins: Math.max(0, d.coins - (c.reward.coins ?? 0)),
        });
      }

      set((st) => ({
        profile: nextProfile,
        completions: st.completions.filter((x) => x.id !== completionId),
      }));
    });

    const day = toDateKey(c.completedAt);
    const d = await db.daily.get(day);
    set((st) => ({
      daily: d ? st.daily.map((x) => (x.id === d.id ? d : x)) : st.daily,
    }));
  },

  async placeBuilding(typeId, x, y) {
    const s = get();
    const type = buildingType(typeId);
    if (!type) return { ok: false, message: '未知建筑' };
    const extent = LEVELS.find((l) => l.level === s.profile.level)?.extent ?? 6;
    if (!canPlace(s.buildings, { typeId, x, y }, extent)) {
      return { ok: false, message: '这个位置放不下（超出范围或与已有建筑重叠）' };
    }
    if (s.profile.resources.coins < (type.cost.coins ?? 0) ||
        s.profile.resources.wood < (type.cost.wood ?? 0) ||
        s.profile.resources.stone < (type.cost.stone ?? 0)) {
      return { ok: false, message: '资源不足' };
    }

    const before = s.buildings;
    const instance: BuildingInstance = {
      id: uid('bld'),
      typeId,
      x,
      y,
      level: 1,
      placedAt: Date.now(),
      variant: Math.floor(Math.random() * 4),
    };
    const after = [...before, instance];
    const nextProfile: Profile = {
      ...s.profile,
      resources: subtractResources(s.profile.resources, type.cost),
    };

    await db.transaction('rw', [db.buildings, db.meta], async () => {
      await db.buildings.add(instance);
      await db.meta.put({ id: 'profile', value: nextProfile });
    });

    set((st) => ({
      buildings: after,
      profile: nextProfile,
      selectedBuildingId: instance.id,
      past: [...st.past, { label: `建造 ${type.name}`, before, after }].slice(-50),
      future: [],
    }));
    return { ok: true, message: `${type.name} 建造完成` };
  },

  async moveBuilding(id, x, y) {
    const s = get();
    const b = s.buildings.find((v) => v.id === id);
    if (!b) return { ok: false, message: '建筑不存在' };
    const extent = LEVELS.find((l) => l.level === s.profile.level)?.extent ?? 6;
    if (!canPlace(s.buildings, { typeId: b.typeId, x, y }, extent, id)) {
      return { ok: false, message: '这里放不下' };
    }
    const before = s.buildings;
    const after = before.map((v) => (v.id === id ? { ...v, x, y } : v));
    await db.buildings.update(id, { x, y });
    set((st) => ({
      buildings: after,
      past: [...st.past, { label: '移动建筑', before, after }].slice(-50),
      future: [],
    }));
    return { ok: true, message: '已移动' };
  },

  async upgradeBuilding(id) {
    const s = get();
    const b = s.buildings.find((v) => v.id === id);
    if (!b) return { ok: false, message: '建筑不存在' };
    const type = buildingType(b.typeId);
    if (!type) return { ok: false, message: '未知建筑' };
    if (b.level >= type.maxLevel) return { ok: false, message: '已达最高等级' };
    const cost = upgradeCostFor(type, b.level);
    const r = s.profile.resources;
    if (r.coins < (cost.coins ?? 0) ||
        r.wood < (cost.wood ?? 0) ||
        r.stone < (cost.stone ?? 0)) {
      return { ok: false, message: '资源不足，无法升级' };
    }
    const nextProfile: Profile = {
      ...s.profile,
      xp: s.profile.xp + UPGRADE_XP,
      level: levelFromXp(s.profile.xp + UPGRADE_XP).level,
      resources: subtractResources(r, cost),
    };
    const before = s.buildings;
    const after = before.map((v) => (v.id === id ? { ...v, level: v.level + 1 } : v));

    await db.transaction('rw', [db.buildings, db.meta], async () => {
      await db.buildings.update(id, { level: b.level + 1 });
      await db.meta.put({ id: 'profile', value: nextProfile });
    });

    set((st) => ({
      buildings: after,
      profile: nextProfile,
      past: [...st.past, { label: `升级 ${type.name}`, before, after }].slice(-50),
      future: [],
    }));
    return { ok: true, message: `升级到 Lv.${b.level + 1}` };
  },

  async sellBuilding(id) {
    const s = get();
    const b = s.buildings.find((v) => v.id === id);
    if (!b) return { ok: false, message: '建筑不存在' };
    const type = buildingType(b.typeId);
    if (!type) return { ok: false, message: '未知建筑' };
    const value = sellValue(type, b.level);
    const before = s.buildings;
    const after = before.filter((v) => v.id !== id);
    const nextProfile: Profile = {
      ...s.profile,
      resources: addResources(s.profile.resources, value),
    };
    await db.transaction('rw', [db.buildings, db.meta], async () => {
      await db.buildings.delete(id);
      await db.meta.put({ id: 'profile', value: nextProfile });
    });
    set((st) => ({
      buildings: after,
      profile: nextProfile,
      selectedBuildingId: st.selectedBuildingId === id ? null : st.selectedBuildingId,
      past: [...st.past, { label: `拆除 ${type.name}`, before, after }].slice(-50),
      future: [],
    }));
    return { ok: true, message: `已拆除，返还 ${value.coins} 金币` };
  },

  selectBuilding(id) {
    set({ selectedBuildingId: id });
  },

  setPlacing(typeId) {
    set((s) => ({
      placingTypeId: s.placingTypeId === typeId ? null : typeId,
      selectedBuildingId: s.placingTypeId === typeId ? s.selectedBuildingId : null,
    }));
  },

  undo() {
    const s = get();
    const last = s.past[s.past.length - 1];
    if (!last) return;
    set({
      buildings: last.before,
      past: s.past.slice(0, -1),
      future: [last, ...s.future].slice(0, 50),
    });
    void db.buildings.clear();
    void db.buildings.bulkAdd(last.before);
  },

  redo() {
    const s = get();
    const next = s.future[0];
    if (!next) return;
    set({
      buildings: next.after,
      past: [...s.past, next].slice(-50),
      future: s.future.slice(1),
    });
    void db.buildings.clear();
    void db.buildings.bulkAdd(next.after);
  },

  async renameCity(name) {
    const s = get();
    const nextProfile = { ...s.profile, cityName: name.trim() || '我的微型世界' };
    await db.meta.put({ id: 'profile', value: nextProfile });
    set({ profile: nextProfile });
  },

  async exportData() {
    const s = get();
    const payload = {
      format: 'tiny-world@1',
      exportedAt: Date.now(),
      profile: s.profile,
      tasks: s.tasks,
      completions: s.completions,
      buildings: s.buildings,
      events: s.events,
      daily: s.daily,
    };
    return JSON.stringify(payload, null, 2);
  },

  async importData(json) {
    try {
      const parsed = JSON.parse(json);
      if (parsed?.format !== 'tiny-world@1') {
        return { ok: false, message: '文件格式不正确' };
      }
      const p = parsed.profile as Profile;
      await db.transaction('rw', db.tables, async () => {
        await db.tasks.clear();
        await db.completions.clear();
        await db.buildings.clear();
        await db.events.clear();
        await db.daily.clear();
        await db.meta.clear();
        if (Array.isArray(parsed.tasks)) await db.tasks.bulkAdd(parsed.tasks);
        if (Array.isArray(parsed.completions)) await db.completions.bulkAdd(parsed.completions);
        if (Array.isArray(parsed.buildings)) await db.buildings.bulkAdd(parsed.buildings);
        if (Array.isArray(parsed.events)) await db.events.bulkAdd(parsed.events);
        if (Array.isArray(parsed.daily)) await db.daily.bulkAdd(parsed.daily);
        if (p) await db.meta.put({ id: 'profile', value: p });
      });
      set({
        profile: parsed.profile ?? defaultProfile(),
        tasks: parsed.tasks ?? [],
        completions: parsed.completions ?? [],
        buildings: parsed.buildings ?? [],
        events: parsed.events ?? [],
        daily: parsed.daily ?? [],
        past: [],
        future: [],
      });
      return { ok: true, message: '数据恢复成功' };
    } catch {
      return { ok: false, message: '解析失败，请检查文件是否完整' };
    }
  },
}));

export { EMPTY_RESOURCES };
export const selectResources = (s: StoreState): Resources => s.profile.resources;
export const selectConflicts = (s: StoreState) => (id: string) => {
  const b = s.buildings.find((v) => v.id === id);
  return b ? conflictsWith(s.buildings, b, id) : false;
};
