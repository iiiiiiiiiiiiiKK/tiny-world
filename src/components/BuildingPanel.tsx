import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpCircle,
  Coins,
  Hammer,
  Info,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { buildingType } from '../config/buildings';
import { CostTag, ResourceIcon, UpgradeCostTag } from './ui';
import { sellValue } from '../lib/grid';

export default function BuildingPanel() {
  const buildings = useStore((s) => s.buildings);
  const selectedId = useStore((s) => s.selectedBuildingId);
  const selectBuilding = useStore((s) => s.selectBuilding);
  const profile = useStore((s) => s.profile);
  const upgradeBuilding = useStore((s) => s.upgradeBuilding);
  const sellBuilding = useStore((s) => s.sellBuilding);
  const setToast = useStore((s) => s.setToast);
  const navigate = useNavigate();

  const selected = buildings.find((b) => b.id === selectedId) ?? null;
  const type = selected ? buildingType(selected.typeId) : undefined;

  const [confirmSell, setConfirmSell] = useState(false);

  const totalValue = useMemo(() => {
    let coins = 0;
    let wood = 0;
    let stone = 0;
    for (const b of buildings) {
      const t = buildingType(b.typeId);
      if (!t) continue;
      const v = sellValue(t, b.level);
      coins += v.coins;
      wood += v.wood;
      stone += v.stone;
    }
    return { coins, wood, stone };
  }, [buildings]);

  return (
    <AnimatePresence>
      {selected && type && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md px-3 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] lg:bottom-4 lg:pb-4"
        >
          <div className="rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-bold text-slate-800">{type.name}</h3>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    Lv.{selected.level}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{type.description}</p>
              </div>
              <button
                type="button"
                onClick={() => selectBuilding(null)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 py-1.5">
                <div className="text-[10px] text-slate-400">占地</div>
                <div className="text-xs font-bold text-slate-700">
                  {type.size.w}×{type.size.h}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 py-1.5">
                <div className="text-[10px] text-slate-400">位置</div>
                <div className="text-xs font-bold text-slate-700">
                  {selected.x},{selected.y}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 py-1.5">
                <div className="text-[10px] text-slate-400">最高等级</div>
                <div className="text-xs font-bold text-slate-700">Lv.{type.maxLevel}</div>
              </div>
            </div>

            {selected.level < type.maxLevel && (
              <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    升级到 Lv.{selected.level + 1}
                  </span>
                  <UpgradeCostTag type={type} level={selected.level} have={profile.resources} />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await upgradeBuilding(selected.id);
                    setToast(r.message, r.ok ? 'ok' : 'error');
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  升级
                </button>
              </div>
            )}

            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/buildings')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Hammer className="h-3.5 w-3.5" />
                建造更多
              </button>
              {confirmSell ? (
                <button
                  type="button"
                  onClick={async () => {
                    const r = await sellBuilding(selected.id);
                    setToast(r.message, r.ok ? 'ok' : 'error');
                    setConfirmSell(false);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-500 py-2 text-xs font-bold text-white transition hover:bg-rose-600"
                >
                  确认拆除
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmSell(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  拆除
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* 底部资源条 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+58px)] z-20 flex justify-center px-3 lg:bottom-4 lg:right-4 lg:left-auto">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur">
          {(
            [
              { k: 'coins', name: '金币', c: 'text-amber-500' },
              { k: 'wood', name: '木材', c: 'text-emerald-600' },
              { k: 'stone', name: '石材', c: 'text-slate-500' },
            ] as const
          ).map((r) => (
            <span
              key={r.k}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700"
              data-testid={`resource-${r.k}`}
            >
              <ResourceIcon kind={r.k} className={`h-3.5 w-3.5 ${r.c}`} />
              <span className="font-semibold text-slate-500">{r.name}</span>
              {profile.resources[r.k]}
            </span>
          ))}
          {buildings.length > 0 && (
            <span className="hidden items-center gap-0.5 border-l border-slate-200 pl-2 text-[10px] font-medium text-slate-400 sm:inline-flex">
              <Info className="h-3 w-3" />
              建筑 {buildings.length} 座 · 价值{' '}
              <CostTag cost={totalValue} className="!gap-1.5" />
            </span>
          )}
        </div>
      </div>

      {/* 空状态时的建造入口 */}
      {buildings.length === 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+58px)] z-20 flex justify-center px-3 lg:bottom-4 lg:right-4 lg:left-auto">
          <button
            type="button"
            onClick={() => navigate('/buildings')}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            去商店建造
            <Coins className="ml-1 h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </AnimatePresence>
  );
}
