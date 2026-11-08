/** 日期工具：全部以本地时区的 yyyy-mm-dd 作为「天」的关键字。 */

export function toDateKey(d: Date | number = new Date()): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export function daysBetween(a: string, b: string): number {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86400000);
}

/** 周期键：daily → yyyy-mm-dd；weekly → ISO 周；once → 固定值；custom → 具体日期 */
export function periodKey(
  repeatType: string,
  dateKey: string,
  repeatDays: number[] = [],
): string {
  switch (repeatType) {
    case 'daily':
      return `d:${dateKey}`;
    case 'weekly':
      return `w:${weekKey(dateKey)}`;
    case 'once':
      return 'o:once';
    case 'custom': {
      if (repeatDays.length === 0) return `x:${dateKey}`;
      const dow = parseDateKey(dateKey).getDay();
      return `x:${dateKey}:${repeatDays.includes(dow) ? 'on' : 'off'}`;
    }
    default:
      return `d:${dateKey}`;
  }
}

export function weekKey(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNum =
    1 + Math.round((firstThursday - target.valueOf()) / 604800000);
  return `${target.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** 任务在某个日期是否应当出现（用于自定义周期） */
export function taskActiveOn(task: { repeatType: string; repeatDays: number[] }, dateKey: string): boolean {
  switch (task.repeatType) {
    case 'daily':
      return true;
    case 'weekly':
      return true;
    case 'once':
      return true;
    case 'custom': {
      if (task.repeatDays.length === 0) return false;
      return task.repeatDays.includes(parseDateKey(dateKey).getDay());
    }
    default:
      return true;
  }
}

export function weekdayNames(): { value: number; label: string }[] {
  return [
    { value: 1, label: '一' },
    { value: 2, label: '二' },
    { value: 3, label: '三' },
    { value: 4, label: '四' },
    { value: 5, label: '五' },
    { value: 6, label: '六' },
    { value: 0, label: '日' },
  ];
}

export function formatDate(d: number | string): string {
  const date = typeof d === 'number' ? new Date(d) : parseDateKey(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return formatDate(ts);
}
