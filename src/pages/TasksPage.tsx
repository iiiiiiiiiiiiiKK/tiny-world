import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Pencil, Plus, Repeat, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { RepeatType, Task, TaskCategory } from '../types';
import { CATEGORY_META, REPEAT_META, categoryMeta } from '../config/economy';
import { periodKey, toDateKey, weekdayNames } from '../lib/date';

function TaskForm({
  editing,
  onClose,
}: {
  editing: Task | null;
  onClose: () => void;
}) {
  const createTask = useStore((s) => s.createTask);
  const updateTask = useStore((s) => s.updateTask);
  const setToast = useStore((s) => s.setToast);

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState<TaskCategory>(editing?.category ?? 'reading');
  const [repeatType, setRepeatType] = useState<RepeatType>(editing?.repeatType ?? 'daily');
  const [repeatDays, setRepeatDays] = useState<number[]>(editing?.repeatDays ?? []);
  const [coins, setCoins] = useState(editing?.reward.coins ?? 10);
  const [wood, setWood] = useState(editing?.reward.wood ?? 2);
  const [stone, setStone] = useState(editing?.reward.stone ?? 0);
  const [xp, setXp] = useState(editing?.reward.xp ?? 12);

  const meta = categoryMeta(category);

  const submit = async () => {
    if (!name.trim()) {
      setToast('请填写任务名称', 'error');
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      category,
      repeatType,
      repeatDays: repeatType === 'custom' ? repeatDays : [],
      reward: { coins, wood, stone, xp },
      startDate: editing?.startDate ?? null,
      dueDate: editing?.dueDate ?? null,
    };
    if (editing) {
      await updateTask(editing.id, payload);
      setToast('任务已更新', 'ok');
    } else {
      await createTask(payload);
      setToast('任务已创建', 'ok');
    }
    onClose();
  };

  const applyCategory = (c: TaskCategory) => {
    setCategory(c);
    const m = categoryMeta(c);
    setCoins(m.defaultReward.coins);
    setWood(m.defaultReward.wood);
    setStone(m.defaultReward.stone);
    setXp(m.defaultReward.xp);
  };

  const toggleDay = (d: number) => {
    setRepeatDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 30, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            {editing ? '编辑任务' : '新建任务'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="block text-xs font-semibold text-slate-600">名称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：阅读 20 分钟"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />

        <label className="mt-3 block text-xs font-semibold text-slate-600">描述（可选）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="什么算完成？"
          className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />

        <label className="mt-3 block text-xs font-semibold text-slate-600">分类</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORY_META.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => applyCategory(c.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                category === c.id ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600'
              }`}
              style={category === c.id ? { background: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-semibold text-slate-600">重复周期</label>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {REPEAT_META.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRepeatType(r.id)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                repeatType === r.id
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {repeatType === 'custom' && (
          <div className="mt-2 flex gap-1.5">
            {weekdayNames().map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`h-8 w-8 rounded-lg text-[11px] font-bold transition ${
                  repeatDays.includes(d.value)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}

        <label className="mt-3 block text-xs font-semibold text-slate-600">奖励</label>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {([
            { k: 'coins', label: '金币', v: coins, set: setCoins },
            { k: 'wood', label: '木材', v: wood, set: setWood },
            { k: 'stone', label: '石材', v: stone, set: setStone },
            { k: 'xp', label: '经验', v: xp, set: setXp },
          ] as const).map((f) => (
            <label key={f.k} className="block">
              <span className="text-[10px] text-slate-400">{f.label}</span>
              <input
                type="number"
                min={0}
                value={f.v}
                onChange={(e) => f.set(Math.max(0, Number(e.target.value) || 0))}
                className="mt-0.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-emerald-400"
              />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          当前分类「{meta.name}」的默认奖励为 {meta.defaultReward.coins} 金币 /{' '}
          {meta.defaultReward.wood} 木材 / {meta.defaultReward.stone} 石材 /{' '}
          {meta.defaultReward.xp} XP，可自由调整。
        </p>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            {editing ? '保存' : '创建任务'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TasksPage() {
  const tasks = useStore((s) => s.tasks);
  const completions = useStore((s) => s.completions);
  const completeTask = useStore((s) => s.completeTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const undoTask = useStore((s) => s.undoTask);
  const setToast = useStore((s) => s.setToast);

  const [editing, setEditing] = useState<Task | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const [lastReward, setLastReward] = useState<string | null>(null);

  const today = toDateKey();

  const completedSet = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of completions) m.set(c.id, c.periodKey);
    return m;
  }, [completions]);

  const isDone = (t: Task) =>
    completedSet.has(`${t.id}::${periodKey(t.repeatType, today, t.repeatDays)}`);

  const visible = useMemo(() => {
    const list = tasks.filter((t) => !t.archived);
    if (filter === 'active') return list.filter((t) => !isDone(t));
    if (filter === 'done') return list.filter((t) => isDone(t));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, filter, completedSet, today]);

  const onComplete = async (t: Task) => {
    const r = await completeTask(t.id);
    if (r.ok) {
      setLastReward(`+${t.reward.coins} 金币 · +${t.reward.xp} XP`);
      setTimeout(() => setLastReward(null), 2000);
    } else {
      setToast(r.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-800 sm:text-xl">任务中心</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            把现实里的小目标写下来，完成它们，让城市长大。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95 sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          新建
        </button>
      </div>

      <div className="flex gap-1.5">
        {(
          [
            { id: 'active', name: '待完成' },
            { id: 'done', name: '已完成' },
            { id: 'all', name: '全部' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.id
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {lastReward && (
        <div className="tw-pop rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-bold text-emerald-700">
          {lastReward}
        </div>
      )}

      <div className="space-y-2.5">
        {visible.map((t) => {
          const done = isDone(t);
          const meta = categoryMeta(t.category);
          const repeat = REPEAT_META.find((r) => r.id === t.repeatType)?.name ?? '每日';
          const completion = completions.find(
            (c) => c.id === `${t.id}::${periodKey(t.repeatType, today, t.repeatDays)}`,
          );
          return (
            <div
              key={t.id}
              className={`rounded-2xl border bg-white p-3.5 transition ${
                done ? 'border-emerald-200' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 h-10 w-1.5 shrink-0 rounded-full"
                  style={{ background: meta.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3
                      className={`text-sm font-bold ${
                        done ? 'text-slate-400 line-through' : 'text-slate-800'
                      }`}
                    >
                      {t.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      <Repeat className="h-2.5 w-2.5" />
                      {repeat}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700">
                      +{t.reward.coins} 金币
                    </span>
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                      +{t.reward.wood} 木材
                    </span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">
                      +{t.reward.stone} 石材
                    </span>
                    <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-sky-700">
                      +{t.reward.xp} XP
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {done ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      已完成
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onComplete(t)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 active:scale-95"
                    >
                      完成
                    </button>
                  )}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      aria-label="编辑"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {completion && (
                      <button
                        type="button"
                        onClick={async () => {
                          await undoTask(completion.id);
                          setToast('已撤销本次完成', 'info');
                        }}
                        className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="撤销完成"
                      >
                        <UndoIcon />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteTask(t.id);
                        setToast('任务已删除', 'info');
                      }}
                      className="rounded-md p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      aria-label="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
            <div className="text-sm font-semibold text-slate-500">这里空空如也</div>
            <p className="mt-1 text-xs text-slate-400">
              {filter === 'active' ? '所有任务都完成啦，休息一下也很好。' : '换个筛选看看？'}
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {formOpen && (
          <TaskForm
            editing={editing}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 13a9 9 0 1 0 2.6-6.4L3 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
