import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { BuildingGrid, BuildingThumb, CostTag } from '../components/ui';
import type { BuildingType } from '../types';

export default function ShopPage() {
  const profile = useStore((s) => s.profile);
  const setPlacing = useStore((s) => s.setPlacing);
  const setToast = useStore((s) => s.setToast);
  const navigate = useNavigate();
  const [detail, setDetail] = useState<BuildingType | null>(null);

  const pick = (t: BuildingType) => {
    setDetail(t);
  };

  const startBuild = (t: BuildingType) => {
    if (t.unlockLevel > profile.level) {
      setToast(`需要城市等级 Lv.${t.unlockLevel} 才能建造`, 'error');
      return;
    }
    const affordable =
      profile.resources.coins >= (t.cost.coins ?? 0) &&
      profile.resources.wood >= (t.cost.wood ?? 0) &&
      profile.resources.stone >= (t.cost.stone ?? 0);
    if (!affordable) {
      setToast('资源不足，先去完成一些任务吧', 'error');
      return;
    }
    setPlacing(t.id);
    navigate('/');
    setToast(`点击城市空地放置「${t.name}」`, 'info');
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800 sm:text-xl">建筑商店</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          用现实里攒下的资源，为城市添砖加瓦。选中后在城市中点击空地即可放置。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
        {(
          [
            { k: 'coins', name: '金币', v: profile.resources.coins },
            { k: 'wood', name: '木材', v: profile.resources.wood },
            { k: 'stone', name: '石材', v: profile.resources.stone },
          ] as const
        ).map((r) => (
          <div
            key={r.k}
            data-testid={`shop-${r.k}`}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <div className="text-[10px] text-slate-400">{r.name}</div>
            <div className="text-base font-black text-slate-800">{r.v}</div>
          </div>
        ))}
      </div>

      <BuildingGrid onPick={pick} />

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="safe-bottom w-full max-w-sm rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-sky-50 to-emerald-50">
                <BuildingThumb type={detail} size={72} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-800">{detail.name}</h3>
                <p className="text-[11px] text-slate-400">{detail.nameEn}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {detail.description}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="text-[10px] text-slate-400">占地</div>
                <div className="text-xs font-bold text-slate-700">
                  {detail.size.w}×{detail.size.h}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="text-[10px] text-slate-400">解锁等级</div>
                <div className="text-xs font-bold text-slate-700">Lv.{detail.unlockLevel}</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <div className="text-[10px] text-slate-400">最高等级</div>
                <div className="text-xs font-bold text-slate-700">Lv.{detail.maxLevel}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-semibold text-slate-600">建造成本</span>
              {detail.unlockLevel > profile.level ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
                  <Lock className="h-3 w-3" />
                  Lv.{detail.unlockLevel} 解锁
                </span>
              ) : (
                <CostTag cost={detail.cost} have={profile.resources} />
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                继续浏览
              </button>
              <button
                type="button"
                onClick={() => startBuild(detail)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                去建造
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
