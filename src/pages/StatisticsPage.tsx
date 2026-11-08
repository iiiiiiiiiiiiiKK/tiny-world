import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Coins, Flame, Layers, TrendingUp, TreePine, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { buildingType } from '../config/buildings';
import { LEVELS, levelProgress } from '../config/economy';

export default function StatisticsPage() {
  const profile = useStore((s) => s.profile);
  const buildings = useStore((s) => s.buildings);
  const tasks = useStore((s) => s.tasks);
  const completions = useStore((s) => s.completions);

  const progress = levelProgress(profile.xp);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of buildings) m.set(b.typeId, (m.get(b.typeId) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [buildings]);

  const categoryStats = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of completions) {
      const t = tasks.find((x) => x.id === c.taskId);
      if (t) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [completions, tasks]);

  const maxCat = categoryStats[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800 sm:text-xl">城市统计</h1>
        <p className="mt-0.5 text-xs text-slate-500">这座城市现在的样子，都记录在这里。</p>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            { icon: Zap, name: '累计经验', value: profile.totalXp, color: 'text-sky-600 bg-sky-50' },
            { icon: Layers, name: '城市等级', value: `Lv.${profile.level}`, color: 'text-emerald-600 bg-emerald-50' },
            { icon: Building2, name: '建筑数量', value: buildings.length, color: 'text-amber-600 bg-amber-50' },
            { icon: Coins, name: '累计金币', value: profile.totalCoins, color: 'text-orange-600 bg-orange-50' },
            { icon: Flame, name: '当前连续', value: `${profile.streak} 天`, color: 'text-rose-600 bg-rose-50' },
            { icon: TrendingUp, name: '最长连续', value: `${profile.bestStreak} 天`, color: 'text-violet-600 bg-violet-50' },
          ] as const
        ).map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.name} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className={`inline-grid h-8 w-8 place-items-center rounded-lg ${s.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-2 text-lg font-black leading-none text-slate-800">{s.value}</div>
              <div className="mt-1 text-[11px] text-slate-400">{s.name}</div>
            </div>
          );
        })}
      </div>

      {/* 等级进度 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">城市等级</h2>
        <div className="mt-3 space-y-1.5">
          {LEVELS.map((l) => {
            const reached = profile.level >= l.level;
            const current = profile.level === l.level;
            return (
              <div
                key={l.level}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                  current
                    ? 'bg-emerald-50 ring-1 ring-emerald-200'
                    : reached
                      ? 'bg-slate-50'
                      : 'bg-white'
                }`}
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${
                    reached ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {l.level}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-sm font-bold ${
                      reached ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {l.name} <span className="text-[10px] font-medium text-slate-400">{l.nameEn}</span>
                  </div>
                  <div className="truncate text-[11px] text-slate-400">{l.desc}</div>
                </div>
                <div className="shrink-0 text-[11px] font-semibold text-slate-400">
                  {l.xp} XP
                </div>
              </div>
            );
          })}
        </div>
        {progress.next && (
          <p className="mt-3 text-right text-[11px] text-slate-400">
            距离 Lv.{progress.next.level} {progress.next.name} 还差 {progress.remaining} XP
          </p>
        )}
      </div>

      {/* 建筑构成 */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold text-slate-800">建筑构成</h2>
          {byType.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">
              还没有建筑。去
              <Link to="/buildings" className="mx-1 font-semibold text-emerald-600 underline">
                商店
              </Link>
              建第一座吧。
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {byType.map(([typeId, count]) => {
                const t = buildingType(typeId);
                if (!t) return null;
                const pct = Math.round((count / buildings.length) * 100);
                return (
                  <div key={typeId}>
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-600">{t.name}</span>
                      <span className="text-slate-400">
                        {count} 座 · {pct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 任务类别分布 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-bold text-slate-800">任务类别分布</h2>
          {categoryStats.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">完成一些任务后这里会有统计。</p>
          ) : (
            <div className="mt-3 space-y-2">
              {categoryStats.map(([cat, count]) => {
                const meta = (
                  [
                    { id: 'reading', name: '阅读' },
                    { id: 'study', name: '学习' },
                    { id: 'fitness', name: '运动' },
                    { id: 'work', name: '工作' },
                    { id: 'writing', name: '写作' },
                    { id: 'habit', name: '习惯' },
                    { id: 'mindfulness', name: '休息' },
                    { id: 'social', name: '社交' },
                    { id: 'other', name: '其他' },
                  ] as const
                ).find((c) => c.id === cat);
                const pct = Math.round((count / maxCat) * 100);
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-[11px] font-semibold text-slate-600">
                      {meta?.name ?? cat}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-sky-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-[11px] text-slate-400">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 资源 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-800">当前资源</h2>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {(
            [
              { icon: Coins, name: '金币', v: profile.resources.coins, c: 'text-amber-600' },
              { icon: TreePine, name: '木材', v: profile.resources.wood, c: 'text-emerald-600' },
              { icon: Layers, name: '石材', v: profile.resources.stone, c: 'text-slate-500' },
            ] as const
          ).map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.name} className="rounded-xl bg-slate-50 p-3 text-center">
                <Icon className={`mx-auto h-5 w-5 ${r.c}`} />
                <div className="mt-1.5 text-lg font-black leading-none text-slate-800">{r.v}</div>
                <div className="mt-1 text-[11px] text-slate-400">{r.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
