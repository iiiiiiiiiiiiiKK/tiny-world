import { useMemo } from 'react';
import { CalendarDays, Flame, Heart, PartyPopper, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { addDays, formatDate, toDateKey } from '../lib/date';

export default function HistoryPage() {
  const profile = useStore((s) => s.profile);
  const daily = useStore((s) => s.daily);
  const events = useStore((s) => s.events);
  const completions = useStore((s) => s.completions);

  // 最近的 18 周热力图
  const weeks = useMemo(() => {
    const today = new Date();
    const end = toDateKey(today);
    const out: { key: string; count: number; inRange: boolean }[] = [];
    for (let i = 17; i >= 0; i--) {
      const week: { key: string; count: number; inRange: boolean }[] = [];
      const monday = new Date(today);
      monday.setDate(today.getDate() - i * 7 - ((today.getDay() + 6) % 7));
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + d);
        const key = toDateKey(day);
        const rec = daily.find((x) => x.id === key);
        week.push({ key, count: rec?.tasks ?? 0, inRange: key <= end });
      }
      out.push(...week);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daily]);

  const maxCount = Math.max(1, ...weeks.map((w) => w.count));

  const today = toDateKey();
  const todayRec = daily.find((d) => d.id === today);
  const weekKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) keys.push(addDays(today, -i));
    return keys;
  }, [today]);

  const weekTotal = useMemo(
    () =>
      weekKeys.reduce((sum, k) => {
        const r = daily.find((d) => d.id === k);
        return sum + (r?.tasks ?? 0);
      }, 0),
    [daily, weekKeys],
  );

  const levelHistory = useMemo(() => {
    // 按时间顺序重建城市等级历史
    const sorted = [...completions].sort((a, b) => a.completedAt - b.completedAt);
    const marks: { at: number; xp: number; label: string }[] = [];
    let acc = 0;
    for (const c of sorted) {
      acc += c.reward.xp ?? 0;
      marks.push({ at: c.completedAt, xp: acc, label: formatDate(c.completedAt) });
    }
    return marks.slice(-30);
  }, [completions]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800 sm:text-xl">成长记录</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          漏掉一天也没关系 —— 你已有的建筑和等级永远都在。
        </p>
      </div>

      {/* 概览 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(
          [
            { icon: Sparkles, name: '今日完成', value: `${todayRec?.tasks ?? 0} 个`, c: 'text-emerald-600 bg-emerald-50' },
            { icon: CalendarDays, name: '本周完成', value: `${weekTotal} 个`, c: 'text-sky-600 bg-sky-50' },
            { icon: Flame, name: '连续活跃', value: `${profile.streak} 天`, c: 'text-rose-600 bg-rose-50' },
            { icon: Heart, name: '累计任务', value: `${profile.totalTasks} 个`, c: 'text-violet-600 bg-violet-50' },
          ] as const
        ).map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.name} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className={`inline-grid h-8 w-8 place-items-center rounded-lg ${s.c}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-2 text-lg font-black leading-none text-slate-800">{s.value}</div>
              <div className="mt-1 text-[11px] text-slate-400">{s.name}</div>
            </div>
          );
        })}
      </div>

      {/* 热力图 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">活跃热力图</h2>
        <p className="mt-0.5 text-[11px] text-slate-400">最近 18 周，颜色越深代表当天完成的任务越多</p>
        <div className="mt-3 overflow-x-auto pb-1">
          <div
            className="grid grid-flow-col gap-1"
            style={{ gridTemplateRows: 'repeat(7, 12px)' }}
          >
            {weeks.map((w) => {
              const ratio = w.count / maxCount;
              const bg =
                w.count === 0
                  ? '#eef2f5'
                  : ratio > 0.66
                    ? '#2f9e44'
                    : ratio > 0.33
                      ? '#74c69d'
                      : '#b2f2bb';
              return (
                <div
                  key={w.key}
                  title={`${w.key} · ${w.count} 个任务`}
                  className="rounded-[2px]"
                  style={{ width: 12, height: 12, background: bg }}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
          <span>少</span>
          {['#eef2f5', '#b2f2bb', '#74c69d', '#2f9e44'].map((c) => (
            <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />
          ))}
          <span>多</span>
        </div>
      </div>

      {/* 本周 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">最近 7 天</h2>
        <div className="mt-3 space-y-1.5">
          {weekKeys.map((k) => {
            const r = daily.find((d) => d.id === k);
            const pct = Math.min(100, ((r?.tasks ?? 0) / 5) * 100);
            return (
              <div key={k} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-[11px] font-semibold text-slate-500">
                  {formatDate(k)}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[11px] text-slate-400">
                  {r ? `${r.tasks} 个 · ${r.xp} XP` : '休息'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 城市成长历史 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">城市成长历史</h2>
        {levelHistory.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">完成第一个任务，这里就会开始记录。</p>
        ) : (
          <ol className="mt-3 space-y-2.5">
            {[...levelHistory].reverse().map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-500">{h.label}</span>
                <span className="ml-auto text-[11px] text-slate-400">累计 {h.xp} XP</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 城市事件 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">城市大事记</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">还没有发生什么特别的事。</p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {events.slice(0, 20).map((e) => (
              <div key={e.id} className="rounded-xl bg-amber-50/70 p-3">
                <div className="flex items-center gap-1.5">
                  <PartyPopper className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">{e.title}</span>
                  <span className="ml-auto text-[10px] text-amber-700/60">
                    {formatDate(e.at)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800/75">{e.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
