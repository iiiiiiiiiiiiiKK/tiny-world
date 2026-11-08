import Dexie, { type Table } from 'dexie';
import type {
  BuildingInstance,
  CityEvent,
  DailyRecord,
  MetaRow,
  Task,
  TaskCompletion,
} from '../types';

export class TinyWorldDB extends Dexie {
  tasks!: Table<Task, string>;
  completions!: Table<TaskCompletion, string>;
  buildings!: Table<BuildingInstance, string>;
  events!: Table<CityEvent, string>;
  daily!: Table<DailyRecord, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('tiny-world');
    this.version(1).stores({
      tasks: 'id, archived, createdAt, repeatType',
      completions: 'id, taskId, periodKey, completedAt',
      buildings: 'id, typeId, placedAt',
      events: 'id, at, kind',
      daily: 'id',
      meta: 'id',
    });
  }
}

export const db = new TinyWorldDB();

/** 检测 IndexedDB 是否可用（隐私模式 / 老浏览器） */
export function storageAvailable(): boolean {
  try {
    const probe = '__tw_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
