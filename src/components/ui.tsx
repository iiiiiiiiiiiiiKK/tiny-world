import { useMemo, useState } from 'react';
import { Coins, Gem, Hammer, Lock, TreePine } from 'lucide-react';
import type { BuildingType, Resources } from '../types';
import { BUILDINGS } from '../config/buildings';
import { useStore } from '../store/useStore';
import { upgradeCostFor } from '../lib/grid';
import { drawBuilding, drawShadow } from '../render/sprite';

/** 资源图标 */
export function ResourceIcon({ kind, className = 'h-3.5 w-3.5' }: { kind: keyof Resources; className?: string }) {
  if (kind === 'coins') return <Coins className={className} />;
  if (kind === 'wood') return <TreePine className={className} />;
  return <Gem className={className} />;
}

export function CostTag({
  cost,
  have,
  className = '',
}: {
  cost: Partial<Resources>;
  have?: Resources;
  className?: string;
}) {
  const entries = (Object.keys(cost) as (keyof Resources)[])
    .filter((k) => (cost[k] ?? 0) > 0)
    .map((k) => ({ k, v: cost[k] ?? 0 }));
  if (entries.length === 0) {
    return <span className={`text-xs text-slate-400 ${className}`}>免费</span>;
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {entries.map(({ k, v }) => {
        const enough = have ? have[k] >= v : true;
        return (
          <span
            key={k}
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              enough ? 'text-slate-600' : 'text-rose-500'
            }`}
          >
            <ResourceIcon kind={k} />
            {v}
          </span>
        );
      })}
    </span>
  );
}

/** 建筑缩略图：与主画布同一套像素绘制 */
export function BuildingThumb({
  type,
  size = 64,
  level = 1,
}: {
  type: BuildingType;
  size?: number;
  level?: number;
}) {
  const canvasRef = (node: HTMLCanvasElement | null) => {
    if (!node) return;
    const ctx = node.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    node.width = size * dpr;
    node.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    const scale = size / 48;
    const sc = {
      ctx,
      originX: size / 2,
      originY: size * 0.82,
      scale,
      variant: 0,
    };
    drawShadow(sc, 16 * scale);
    drawBuilding(sc, type.art, 16 * scale);
    if (level > 1) {
      ctx.fillStyle = 'rgba(40,40,50,0.78)';
      ctx.fillRect(size / 2 - 7 * scale, size * 0.06, 14 * scale, 8 * scale);
      ctx.fillStyle = '#ffd85e';
      ctx.font = `bold ${Math.round(6 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(String(level), size / 2, size * 0.06 + 6.4 * scale);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="shrink-0"
      aria-label={type.name}
    />
  );
}

/** 商店网格：按分类筛选、显示解锁等级与可负担状态 */
export function BuildingGrid({ onPick }: { onPick?: (t: BuildingType) => void }) {
  const profile = useStore((s) => s.profile);
  const [cat, setCat] = useState<'all' | BuildingType['category']>('all');
  const list = useMemo(() => {
    return cat === 'all' ? BUILDINGS : BUILDINGS.filter((t) => t.category === cat);
  }, [cat]);

  const cats: { id: 'all' | BuildingType['category']; name: string }[] = [
    { id: 'all', name: '全部' },
    { id: 'basic', name: '基础' },
    { id: 'growth', name: '成长' },
    { id: 'advanced', name: '高级' },
    { id: 'decor', name: '装饰' },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              cat === c.id
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 shadow-sm hover:bg-slate-100'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((t) => {
          const locked = t.unlockLevel > profile.level;
          const affordable =
            !locked &&
            profile.resources.coins >= (t.cost.coins ?? 0) &&
            profile.resources.wood >= (t.cost.wood ?? 0) &&
            profile.resources.stone >= (t.cost.stone ?? 0);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick?.(t)}
              className={`group relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition active:scale-[0.98] ${
                locked
                  ? 'border-slate-200 bg-slate-100/70'
                  : affordable
                    ? 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                    : 'border-slate-200 bg-white/70 opacity-70'
              }`}
            >
              <div
                className={`grid h-16 w-full place-items-center rounded-lg ${
                  locked
                    ? 'bg-slate-100 grayscale'
                    : 'bg-gradient-to-b from-sky-50 to-emerald-50'
                }`}
              >
                <BuildingThumb type={t} size={60} />
              </div>
              <div className={`text-xs font-bold ${locked ? 'text-slate-400' : 'text-slate-700'}`}>
                {t.name}
              </div>
              {locked ? (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                  <Lock className="h-2.5 w-2.5" />
                  Lv.{t.unlockLevel} 解锁
                </span>
              ) : (
                <CostTag cost={t.cost} have={profile.resources} />
              )}
              {t.maxLevel > 1 && !locked && (
                <span className="text-[10px] text-slate-400">可升级至 Lv.{t.maxLevel}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 升级按钮与成本显示 */
export function UpgradeCostTag({
  type,
  level,
  have,
}: {
  type: BuildingType;
  level: number;
  have: Resources;
}) {
  const cost = upgradeCostFor(type, level);
  const entries = (Object.keys(cost) as (keyof Resources)[]).filter((k) => (cost[k] ?? 0) > 0);
  return (
    <span className="inline-flex items-center gap-2.5">
      {entries.map((k) => (
        <span
          key={k}
          className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
            have[k] >= (cost[k] ?? 0) ? 'text-slate-600' : 'text-rose-500'
          }`}
        >
          <ResourceIcon kind={k} />
          {cost[k]}
        </span>
      ))}
      <Hammer className="h-3 w-3 text-slate-400" />
    </span>
  );
}
