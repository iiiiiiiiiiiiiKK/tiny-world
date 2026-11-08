import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Gift, PartyPopper, Undo2, Redo2, Zap } from 'lucide-react';
import CityCanvas from '../components/CityCanvas';
import BuildingPanel from '../components/BuildingPanel';
import { useStore } from '../store/useStore';
import { levelProgress } from '../config/economy';
import { periodKey, toDateKey } from '../lib/date';
import { categoryMeta } from '../config/economy';

/** 完成任务后的奖励飘字 + 随机事件弹窗 */
function RewardOverlay({
  visible,
  rewards,
  event,
}: {
  visible: boolean;
  rewards: { coins: number; wood: number; stone: number; xp: number } | null;
  event?: { title: string; body: string } | null;
}) {
  if (!visible || !rewards) return null;
  const items = [
    { k: 'coins', v: rewards.coins, c: '#f0a92b' },
    { k: 'wood', v: rewards.wood, c: '#4f9e3f' },
    { k: 'stone', v: rewards.stone, c: '#7d8794' },
    { k: 'xp', v: rewards.xp, c: '#4a7fc1' },
  ].filter((i) => i.v > 0);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="relative rounded-2xl border border-emerald-200 bg-white/95 px-6 py-5 text-center shadow-2xl backdrop-blur"
      >
        <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="text-sm font-bold text-slate-800">任务完成！</div>
        <div className="mt-2 flex items-center justify-center gap-3">
          {items.map((i, idx) => (
            <motion.span
              key={i.k}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * idx }}
              className="tw-pop flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold"
              style={{ color: i.c }}
            >
              +{i.v}
              <span className="text-[10px] font-medium text-slate-400">
                {i.k === 'xp' ? 'XP' : i.k === 'coins' ? '金币' : i.k === 'wood' ? '木材' : '石材'}
              </span>
            </motion.span>
          ))}
        </div>
      </motion.div>

      {event && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="absolute bottom-24 left-1/2 w-[min(88vw,22rem)] -translate-x-1/2 rounded-2xl border border-amber-200 bg-amber-50/95 p-4 shadow-xl"
        >
          <div className="flex items-start gap-2.5">
            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-bold text-amber-900">{event.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80">{event.body}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function CityHome() {
  const navigate = useNavigate();
  const profile = useStore((s) => s.profile);
  const tasks = useStore((s) => s.tasks);
  const completions = useStore((s) => s.completions);
  const completeTask = useStore((s) => s.completeTask);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const past = useStore((s) => s.past);
  const future = useStore((s) => s.future);
  const events = useStore((s) => s.events);

  const [reward, setReward] = useState<{
    coins: number;
    wood: number;
    stone: number;
    xp: number;
  } | null>(null);
  const [eventTip, setEventTip] = useState<{ title: string; body: string } | null>(null);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const progress = levelProgress(profile.xp);
  const today = toDateKey();

  const todayTasks = useMemo(
    () => tasks.filter((t) => !t.archived),
    [tasks],
  );

  const completedIds = useMemo(() => {
    const set = new Set<string>();
    for (const c of completions) set.add(c.id);
    return set;
  }, [completions]);

  const isDone = (taskId: string, repeatType: string, repeatDays: number[]) =>
    completedIds.has(`${taskId}::${periodKey(repeatType, today, repeatDays)}`);

  // 首次进入显示今日任务抽屉
  useEffect(() => {
    const t = setTimeout(() => setPanelOpen(true), 350);
    return () => clearTimeout(t);
  }, []);

  const onComplete = async (taskId: string) => {
    const before = profile.level;
    const r = await completeTask(taskId);
    if (!r.ok) return;
    setReward(r.reward ?? null);
    if (r.event) setEventTip({ title: r.event.title, body: r.event.body });
    const after = useStore.getState().profile.level;
    if (after > before) setLevelUp({ from: before, to: after });
    setTimeout(() => {
      setReward(null);
      setEventTip(null);
    }, 2600);
    setTimeout(() => setLevelUp(null), 3200);
  };

  const recentEvent = events[0];

  return (
    <div className="space-y-3">
      {/* 城市画布 */}
      <div className="relative h-[clamp(320px,58vh,620px)] overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <CityCanvas onOpenShop={() => navigate('/buildings')} />

        {/* 顶部状态条 */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/60 bg-white/85 px-3 py-2 shadow-md backdrop-blur">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[11px] leading-tight text-slate-500">城市等级</div>
              <div className="text-xs font-bold leading-tight text-slate-800">
                Lv.{profile.level} · {progress.current.name}
              </div>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={undo}
              disabled={past.length === 0}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/60 bg-white/85 text-slate-600 shadow-md backdrop-blur transition disabled:opacity-40 enabled:hover:bg-white"
              aria-label="撤销"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={future.length === 0}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/60 bg-white/85 text-slate-600 shadow-md backdrop-blur transition disabled:opacity-40 enabled:hover:bg-white"
              aria-label="重做"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 移动端任务面板开关 */}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-white/60 bg-white/85 text-slate-700 shadow-md backdrop-blur transition hover:bg-white lg:hidden"
          aria-label="今日任务"
        >
          <Gift className="h-4 w-4" />
        </button>
      </div>

      {/* 桌面端：今日任务卡片 */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] lg:gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-slate-800">今天做点什么？</h2>
            <span className="text-[11px] text-slate-400">
              连续 {profile.streak} 天 · 最佳 {profile.bestStreak} 天
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            每完成一个现实里的小目标，这座城市就会长大一点。
          </p>
          <div className="mt-3 space-y-2">
            {todayTasks.slice(0, 5).map((t) => {
              const done = isDone(t.id, t.repeatType, t.repeatDays);
              const meta = categoryMeta(t.category);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={done}
                  onClick={() => onComplete(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                    done
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm active:scale-[0.995]'
                  }`}
                >
                  <span
                    className="h-8 w-1.5 shrink-0 rounded-full"
                    style={{ background: meta.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {t.name}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {meta.name} · +{t.reward.coins} 金币 · +{t.reward.xp} XP
                    </span>
                  </span>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <span className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                      完成
                    </span>
                  )}
                </button>
              );
            })}
            {todayTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
                还没有任务，去
                <button
                  type="button"
                  onClick={() => navigate('/tasks')}
                  className="mx-1 font-semibold text-emerald-600 underline"
                >
                  任务中心
                </button>
                创建一个吧
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-800">城市事件</h3>
            {recentEvent ? (
              <div className="mt-2 rounded-xl bg-amber-50 p-3">
                <div className="text-xs font-bold text-amber-900">{recentEvent.title}</div>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800/75">
                  {recentEvent.body}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                完成更多任务，城市里会发生一些小事。
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-800">城市等级</h3>
            <p className="mt-1 text-[11px] text-slate-500">{progress.current.desc}</p>
            <div className="mt-3 space-y-1.5">
              {progress.next ? (
                <>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      Lv.{progress.current.level} {progress.current.name}
                    </span>
                    <span>
                      Lv.{progress.next.level} {progress.next.name}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-400"
                      style={{ width: `${Math.round(progress.ratio * 100)}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    还需 {progress.remaining} XP
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-emerald-50 py-2 text-center text-xs font-semibold text-emerald-700">
                  已达到最高等级
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 移动端底部任务面板 */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="safe-bottom fixed inset-x-0 bottom-[52px] z-30 max-h-[62vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-4 shadow-2xl lg:hidden"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-slate-800">今日任务</h2>
              <span className="text-[11px] text-slate-400">连续 {profile.streak} 天</span>
            </div>
            <div className="space-y-2 pb-2">
              {todayTasks.map((t) => {
                const done = isDone(t.id, t.repeatType, t.repeatDays);
                const meta = categoryMeta(t.category);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={done}
                    onClick={() => onComplete(t.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      done
                        ? 'border-emerald-200 bg-emerald-50/60'
                        : 'border-slate-200 bg-white active:scale-[0.98]'
                    }`}
                  >
                    <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {t.name}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        +{t.reward.coins} 金币 · +{t.reward.xp} XP
                      </span>
                    </span>
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                    ) : (
                      <span className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm">
                        完成
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-semibold text-slate-500"
              >
                + 新建任务
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 建筑详情面板 */}
      <BuildingPanel />

      {/* 奖励动画 */}
      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => setReward(null)}
          >
            <RewardOverlay visible rewards={reward} event={eventTip} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 升级动画 */}
      <AnimatePresence>
        {levelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
          >
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-500 px-8 py-6 text-center text-white shadow-2xl">
              <div className="text-2xl font-black">城市升级！</div>
              <div className="mt-1 text-sm font-semibold opacity-90">
                Lv.{levelUp.from} → Lv.{levelUp.to}
              </div>
              <div className="mt-2 text-xs opacity-80">
                {levelProgress(useStore.getState().profile.xp).current.name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
