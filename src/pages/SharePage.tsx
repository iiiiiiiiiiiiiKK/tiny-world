import { useMemo, useState } from 'react';
import { Copy, Check, Image as ImageIcon, Link2, Share2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { buildingType } from '../config/buildings';
import { levelProgress } from '../config/economy';
import { formatDate } from '../lib/date';
import { BuildingThumb } from '../components/ui';
import { drawBuilding, drawShadow } from '../render/sprite';

const CARD_W = 1200;
const CARD_H = 630;

const COLORS = {
  sky: '#bfe6ff',
  skyDeep: '#a8d8f5',
  grass: '#6cb457',
  grassLight: '#7fd067',
  panel: 'rgba(255,255,255,0.93)',
  ink: '#2f3a3f',
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 生成城市分享卡片（1200×630 PNG），完全程序化绘制 */
function buildShareCard(
  cityName: string,
  level: number,
  levelName: string,
  totalTasks: number,
  buildings: { art: import('../types').BuildingArt; level: number }[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // 背景天空
  const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
  g.addColorStop(0, COLORS.sky);
  g.addColorStop(1, COLORS.skyDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 太阳
  ctx.fillStyle = 'rgba(255, 240, 190, 0.85)';
  ctx.beginPath();
  ctx.arc(1010, 110, 46, 0, Math.PI * 2);
  ctx.fill();

  // 地面菱形
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(CARD_W / 2, 170);
  ctx.lineTo(CARD_W - 30, 400);
  ctx.lineTo(CARD_W / 2, 620);
  ctx.lineTo(30, 400);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = COLORS.grassLight;
  for (let i = -10; i < 10; i++) {
    for (let j = -10; j < 10; j++) {
      if ((i + j) % 2 !== 0) continue;
      const cx = CARD_W / 2 + (i - j) * 42;
      const cy = 395 + (i + j) * 21;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 21);
      ctx.lineTo(cx + 42, cy);
      ctx.lineTo(cx, cy + 21);
      ctx.lineTo(cx - 42, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // 建筑拼贴
  const shown = buildings.slice(0, 12);
  if (shown.length > 0) {
    const cols = Math.min(6, shown.length);
    const cell = 130;
    const startX = CARD_W / 2 - ((cols - 1) * cell) / 2;
    const startY = 330;
    shown.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cell;
      const y = startY + row * (cell + 10);
      const tmp = document.createElement('canvas');
      tmp.width = 120;
      tmp.height = 120;
      const t = tmp.getContext('2d')!;
      t.imageSmoothingEnabled = false;
      const sc = { ctx: t, originX: 60, originY: 100, scale: 2.6, variant: 0 };
      drawShadow(sc, 16 * 2.6);
      drawBuilding(sc, item.art, 16 * 2.6);
      ctx.drawImage(tmp, x - 60, y - 92);
    });
  }

  // 顶部信息面板
  ctx.fillStyle = COLORS.panel;
  roundRect(ctx, 48, 44, 560, 140, 22);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 46px system-ui, "Microsoft YaHei", sans-serif';
  ctx.fillText('Tiny World', 82, 98);
  ctx.font = 'bold 30px system-ui, "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#4f9e3f';
  ctx.fillText(`Lv.${level} ${levelName}`, 82, 142);
  ctx.font = '21px system-ui, "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#5a6a70';
  ctx.fillText(`${totalTasks} 个目标 · ${buildings.length} 座建筑`, 82, 172);

  // 底部城市名面板
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  roundRect(ctx, 48, 486, 470, 92, 18);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 30px system-ui, "Microsoft YaHei", sans-serif';
  ctx.fillText(cityName.slice(0, 16), 78, 526);
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillStyle = '#6b7a80';
  ctx.fillText('Build Your World, One Day at a Time.', 78, 556);

  // 品牌角标
  ctx.fillStyle = 'rgba(47,58,63,0.75)';
  ctx.font = 'bold 21px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('x.com/0xkillcoin', CARD_W - 48, CARD_H - 34);
  ctx.textAlign = 'left';

  return canvas;
}

export default function SharePage() {
  const profile = useStore((s) => s.profile);
  const buildings = useStore((s) => s.buildings);
  const totalTasks = profile.totalTasks;
  const progress = levelProgress(profile.xp);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const buildingList = useMemo(
    () =>
      buildings
        .map((b) => ({ b, t: buildingType(b.typeId) }))
        .filter((x) => x.t)
        .slice(0, 12),
    [buildings],
  );

  const shareText = `我的微型世界「${profile.cityName}」现在是 Lv.${profile.level} ${progress.current.name}，已完成 ${totalTasks} 个目标 🌍 Build Your World, One Day at a Time.`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setMsg(`${label}已复制`);
      setTimeout(() => {
        setCopied(false);
        setMsg(null);
      }, 2000);
    } catch {
      setMsg('复制失败，请手动选择文本');
    }
  };

  const downloadCard = () => {
    try {
      const canvas = buildShareCard(
        profile.cityName,
        profile.level,
        progress.current.name,
        totalTasks,
        buildingList.map((x) => ({ art: x.t!.art, level: x.b.level })),
      );
      const link = document.createElement('a');
      link.download = `tiny-world-${profile.cityName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setMsg('城市图片已生成');
      setTimeout(() => setMsg(null), 2200);
    } catch (e) {
      setMsg(`导出失败：${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800 sm:text-xl">城市分享</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          把这座城市分享出去。第一阶段支持导出图片与本地分享链接。
        </p>
      </div>

      {/* 城市名片 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative h-40 bg-gradient-to-b from-sky-200 to-emerald-100 sm:h-48">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-200/70 to-transparent" />
          <div className="absolute inset-0 flex items-end justify-center gap-1 pb-3">
            {buildingList.slice(0, 10).map((item) => (
              <div key={item.b.id} className="w-12 sm:w-16">
                <BuildingThumb type={item.t!} size={56} level={item.b.level} />
              </div>
            ))}
            {buildingList.length === 0 && (
              <p className="pb-6 text-xs font-medium text-slate-500">还没有建筑，先去建一座吧</p>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-slate-800">{profile.cityName}</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                建城于 {formatDate(profile.createdAt)}
              </p>
            </div>
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              Lv.{profile.level} {progress.current.name}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 py-2.5">
              <div className="text-lg font-black text-slate-800">{totalTasks}</div>
              <div className="text-[10px] text-slate-400">完成目标</div>
            </div>
            <div className="rounded-xl bg-slate-50 py-2.5">
              <div className="text-lg font-black text-slate-800">{buildings.length}</div>
              <div className="text-[10px] text-slate-400">建筑数量</div>
            </div>
            <div className="rounded-xl bg-slate-50 py-2.5">
              <div className="text-lg font-black text-slate-800">{profile.totalXp}</div>
              <div className="text-[10px] text-slate-400">累计经验</div>
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className="tw-pop rounded-xl bg-emerald-50 px-4 py-2.5 text-center text-xs font-bold text-emerald-700">
          {msg}
        </div>
      )}

      {/* 分享操作 */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={downloadCard}
          className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98]"
        >
          <ImageIcon className="h-4 w-4" />
          导出城市图片
        </button>
        <button
          type="button"
          onClick={() => copy(window.location.href, '链接')}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
          复制主页链接
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <Share2 className="h-4 w-4 text-emerald-500" />
          分享文案
        </h3>
        <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          {shareText}
        </p>
        <button
          type="button"
          onClick={() => copy(shareText, '文案')}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Copy className="h-3 w-3" />
          复制文案
        </button>
      </div>

      {/* 建筑清单 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-bold text-slate-800">城市建筑清单</h3>
        {buildingList.length === 0 ? (
          <p className="mt-2 text-xs text-slate-400">暂无建筑。</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {buildingList.map((item) => (
              <span
                key={item.b.id}
                className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
              >
                {item.t!.name}
                {item.b.level > 1 && ` Lv.${item.b.level}`}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
          第一阶段仅支持导出图片与本地主页链接。公开城市主页与多用户访问需要独立的后端与数据存储方案，
          本项目不会把本地数据伪装成已公开。
        </p>
      </div>
    </div>
  );
}
