import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { buildingType } from '../config/buildings';
import { DISTRICT_THEMES } from '../config/palette';
import { LEVELS } from '../config/economy';
import {
  TILE_H,
  TILE_W,
  buildingFootprint,
  canPlace,
  cellToScreen,
  screenToCell,
  tileCorners,
} from '../lib/grid';
import { drawBuilding, drawShadow, px, type SpriteContext } from '../render/sprite';

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface Props {
  onOpenShop?: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.6;

/**
 * 计算世界原点（网格 (0,0) 的屏幕坐标）。
 * 渲染与命中检测必须使用同一套计算，否则拖动后点击会错位。
 */
function computeOrigin(
  w: number,
  h: number,
  extent: number,
  zoom: number,
  cam: Camera,
): { x: number; y: number } {
  // 菱形地面：水平居中，纵向跨度 = extent * TILE_H * zoom
  // 额外下移一点，给高建筑的顶部留出空间
  return {
    x: w / 2 + cam.x,
    y: h / 2 - (extent * TILE_H * zoom) / 2 + 14 + cam.y,
  };
}

export default function CityCanvas({ onOpenShop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const profile = useStore((s) => s.profile);
  const buildings = useStore((s) => s.buildings);
  const placingTypeId = useStore((s) => s.placingTypeId);
  const selectedBuildingId = useStore((s) => s.selectedBuildingId);
  const placeBuilding = useStore((s) => s.placeBuilding);
  const moveBuilding = useStore((s) => s.moveBuilding);
  const selectBuilding = useStore((s) => s.selectBuilding);
  const setPlacing = useStore((s) => s.setPlacing);
  const setToast = useStore((s) => s.setToast);

  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);
  const [dragState, setDragState] = useState<
    | { mode: 'pan'; startX: number; startY: number; camX: number; camY: number }
    | { mode: 'move'; id: string; offsetX: number; offsetY: number; moved: boolean }
    | null
  >(null);
  const [dragging, setDragging] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const extent = useMemo(
    () => LEVELS.find((l) => l.level === profile.level)?.extent ?? 6,
    [profile.level],
  );
  const theme = DISTRICT_THEMES[Math.min(DISTRICT_THEMES.length - 1, profile.level - 1)];

  /* ─────────────────── 渲染 ─────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const cam = cameraRef.current;
    const origin = computeOrigin(w, h, extent, cam.zoom, cam);
    const originX = origin.x;
    const originY = origin.y;

    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#bfe6ff');
    grad.addColorStop(0.55, '#d8f0ff');
    grad.addColorStop(1, '#e8f7e2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 地面菱形区域
    const groundW = extent * TILE_W * cam.zoom;
    const groundH = extent * TILE_H * cam.zoom;

    ctx.save();
    ctx.beginPath();
    const corners = [
      cellToScreen(0, 0, originX, originY, cam.zoom),
      cellToScreen(extent, 0, originX, originY, cam.zoom),
      cellToScreen(extent, extent, originX, originY, cam.zoom),
      cellToScreen(0, extent, originX, originY, cam.zoom),
    ];
    corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = theme.grass;
    ctx.fill();
    ctx.clip();

    // 草地纹理：多层绿
    const patternStep = 1;
    for (let gx = 0; gx < extent; gx += patternStep) {
      for (let gy = 0; gy < extent; gy += patternStep) {
        const p = cellToScreen(gx, gy, originX, originY, cam.zoom);
        const checker = (gx + gy) % 2 === 0;
        ctx.fillStyle = checker ? theme.grassLight : theme.grass;
        ctx.beginPath();
        const hh = (TILE_H / 2) * cam.zoom;
        const hw = (TILE_W / 2) * cam.zoom;
        ctx.moveTo(p.x, p.y - hh);
        ctx.lineTo(p.x + hw, p.y);
        ctx.lineTo(p.x, p.y + hh);
        ctx.lineTo(p.x - hw, p.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 草地随机点缀（小草丛）
    const seed = 20241108;
    let s = seed;
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    ctx.fillStyle = theme.grassDark;
    for (let i = 0; i < extent * 8; i++) {
      const gx = Math.floor(rand() * extent);
      const gy = Math.floor(rand() * extent);
      const p = cellToScreen(gx, gy, originX, originY, cam.zoom);
      const jx = (rand() - 0.5) * TILE_W * cam.zoom * 0.5;
      const jy = (rand() - 0.5) * TILE_H * cam.zoom * 0.5;
      ctx.fillRect(p.x + jx, p.y + jy, Math.max(1, 2 * cam.zoom), Math.max(1, 2 * cam.zoom));
    }

    // 网格线（可关闭）
    if (showGrid && cam.zoom > 0.7) {
      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx <= extent; gx++) {
        const a = cellToScreen(gx, 0, originX, originY, cam.zoom);
        const b = cellToScreen(gx, extent, originX, originY, cam.zoom);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let gy = 0; gy <= extent; gy++) {
        const a = cellToScreen(0, gy, originX, originY, cam.zoom);
        const b = cellToScreen(extent, gy, originX, originY, cam.zoom);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // 建造预览：有效 / 无效区域
    if (placingTypeId) {
      const type = buildingType(placingTypeId);
      if (type) {
        for (let gx = 0; gx < extent; gx++) {
          for (let gy = 0; gy < extent; gy++) {
            const ok = canPlace(buildings, { typeId: placingTypeId, x: gx, y: gy }, extent);
            const pts = tileCorners(gx, gy, originX, originY, cam.zoom);
            ctx.fillStyle = ok ? 'rgba(120, 230, 140, 0.18)' : 'rgba(230, 90, 80, 0.16)';
            ctx.beginPath();
            pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    ctx.restore();

    // 建筑（按 y+x 排序实现遮挡）
    const sorted = [...buildings].sort((a, b) => {
      const ta = buildingType(a.typeId);
      const tb = buildingType(b.typeId);
      const sa = ta ? ta.size.h : 1;
      const sb = tb ? tb.size.h : 1;
      return a.y + a.x + sa * 0.001 - (b.y + b.x + sb * 0.001);
    });

    for (const b of sorted) {
      const type = buildingType(b.typeId);
      if (!type) continue;
      const cells = buildingFootprint(b);
      const anchor = cells.reduce(
        (acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }),
        { x: 0, y: 0 },
      );
      const gx = anchor.x / cells.length;
      const gy = anchor.y / cells.length;
      const pos = cellToScreen(gx, gy, originX, originY, cam.zoom);
      const halfW = (TILE_W / 2) * cam.zoom * type.size.w;

      const sc: SpriteContext = {
        ctx,
        originX: pos.x,
        originY: pos.y,
        scale: cam.zoom,
        variant: b.variant,
      };

      drawShadow(sc, halfW);

      // 选中高亮
      if (selectedBuildingId === b.id) {
        ctx.save();
        ctx.strokeStyle = '#ffd85e';
        ctx.lineWidth = 2;
        const pts = tileCorners(gx, gy, originX, originY, cam.zoom);
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      drawBuilding(sc, type.art, halfW);

      // 等级标记
      if (b.level > 1) {
        px(sc, -3, -type.art.height - 8, 6, 5, 'rgba(40,40,50,0.75)');
        ctx.fillStyle = '#ffd85e';
        ctx.font = 'bold 5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(b.level), pos.x, pos.y + (-type.art.height - 8 + 5) * cam.zoom + 1);
      }
    }

    // 放置中的幽灵预览
    if (placingTypeId && hoverCell) {
      const type = buildingType(placingTypeId);
      if (type) {
        const ok = canPlace(buildings, { typeId: placingTypeId, x: hoverCell.x, y: hoverCell.y }, extent);
        const pos = cellToScreen(hoverCell.x + type.size.w / 2 - 0.5, hoverCell.y + type.size.h / 2 - 0.5, originX, originY, cam.zoom);
        const sc: SpriteContext = {
          ctx,
          originX: pos.x,
          originY: pos.y,
          scale: cam.zoom,
          variant: 0,
        };
        ctx.save();
        ctx.globalAlpha = 0.6;
        drawBuilding(sc, type.art, (TILE_W / 2) * cam.zoom * type.size.w);
        ctx.restore();
        const pts = tileCorners(hoverCell.x, hoverCell.y, originX, originY, cam.zoom);
        ctx.strokeStyle = ok ? '#6fe08a' : '#e05a50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
      }
    }

    void groundW;
    void groundH;
  }, [buildings, camera, extent, hoverCell, placingTypeId, selectedBuildingId, showGrid, theme]);

  /* ─────────────────── 交互 ─────────────────── */
  const localPoint = (e: React.PointerEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const src = 'touches' in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const pickBuilding = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return null;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const cam = cameraRef.current;
      const origin = computeOrigin(w, h, extent, cam.zoom, cam);
      const originX = origin.x;
      const originY = origin.y;

      // 从上到下检测命中（后绘制的在上层）
      const sorted = [...buildings].sort((a, b) => b.y + b.x - (a.y + a.x));
      for (const b of sorted) {
        const type = buildingType(b.typeId);
        if (!type) continue;
        const cells = buildingFootprint(b);
        const anchor = cells.reduce((acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }), { x: 0, y: 0 });
        const gx = anchor.x / cells.length;
        const gy = anchor.y / cells.length;
        const pos = cellToScreen(gx, gy, originX, originY, cam.zoom);
        const halfW = (TILE_W / 2) * cam.zoom * type.size.w;
        const halfH = (TILE_H / 2) * cam.zoom * type.size.w;
        const heightPx = type.art.height * cam.zoom;
        // 建筑包围盒（菱形底 + 高度）
        const inBox =
          Math.abs(sx - pos.x) <= halfW &&
          sy >= pos.y - heightPx - halfH &&
          sy <= pos.y + halfH;
        if (inBox) return b;
      }
      return null;
    },
    [buildings, extent],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    const p = localPoint(e);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(false);

    if (placingTypeId) {
      const cell = screenToCell(p.x, p.y, ...thisOrigin());
      void placeBuilding(placingTypeId, cell.x, cell.y).then((r) => {
        if (!r.ok) setToast(r.message, 'error');
        else {
          setToast(r.message, 'ok');
          setPlacing(placingTypeId);
        }
      });
      return;
    }

    const hit = pickBuilding(p.x, p.y);
    if (hit) {
      selectBuilding(hit.id);
      setDragState({ mode: 'move', id: hit.id, offsetX: 0, offsetY: 0, moved: false });
      return;
    }
    selectBuilding(null);
    setDragState({
      mode: 'pan',
      startX: p.x,
      startY: p.y,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
    });
  };

  const thisOrigin = () => {
    const wrap = wrapRef.current!;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const cam = cameraRef.current;
    const o = computeOrigin(w, h, extent, cam.zoom, cam);
    return [o.x, o.y, cam.zoom] as const;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = localPoint(e);
    if (!dragState) {
      if (placingTypeId) {
        const [ox, oy, z] = thisOrigin();
        setHoverCell(screenToCell(p.x, p.y, ox, oy, z));
      }
      return;
    }
    if (dragState.mode === 'pan') {
      const dx = p.x - dragState.startX;
      const dy = p.y - dragState.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setDragging(true);
      setCamera((c) => ({ ...c, x: dragState.camX + dx, y: dragState.camY + dy }));
    } else if (dragState.mode === 'move') {
      const [ox, oy, z] = thisOrigin();
      const cell = screenToCell(p.x, p.y, ox, oy, z);
      const b = useStore.getState().buildings.find((v) => v.id === dragState.id);
      if (b && (b.x !== cell.x || b.y !== cell.y)) {
        setDragState((d) => (d && d.mode === 'move' ? { ...d, moved: true } : d));
      }
      setHoverCell(cell);
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    const p = localPoint(e);
    if (dragState?.mode === 'move' && dragState.moved) {
      const [ox, oy, z] = thisOrigin();
      const cell = screenToCell(p.x, p.y, ox, oy, z);
      const b = useStore.getState().buildings.find((v) => v.id === dragState.id);
      if (b) {
        const r = await moveBuilding(b.id, cell.x, cell.y);
        if (!r.ok) {
          setToast(r.message, 'error');
          // 位置无效则回到原位
          await moveBuilding(b.id, b.x, b.y);
        } else {
          setToast('已移动', 'ok');
        }
      }
    }
    setDragState(null);
    setDragging(false);
  };

  // 滚轮缩放
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setCamera((c) => {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom * factor));
      return { ...c, zoom };
    });
  };

  // 触控：双指缩放 + 单指拖动
  const touchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { dist: Math.hypot(dx, dy), zoom: cameraRef.current.zoom };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / touchRef.current.dist;
      setCamera((c) => ({
        ...c,
        zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, touchRef.current!.zoom * scale)),
      }));
    }
  };
  const onTouchEnd = () => {
    touchRef.current = null;
  };

  const zoomBy = (f: number) =>
    setCamera((c) => ({ ...c, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, c.zoom * f)) }));

  const resetView = () => setCamera({ x: 0, y: 0, zoom: 1 });

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={wrapRef}
        className="h-full w-full touch-none select-none"
        style={{ cursor: dragging ? 'grabbing' : placingTypeId ? 'copy' : 'grab' }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>

      {/* 缩放控制 */}
      <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          className="h-9 w-9 rounded-lg bg-white/90 text-lg font-bold text-slate-700 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
          aria-label="放大"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          className="h-9 w-9 rounded-lg bg-white/90 text-lg font-bold text-slate-700 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
          aria-label="缩小"
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          className="h-9 w-9 rounded-lg bg-white/90 text-[10px] font-semibold text-slate-600 shadow-md backdrop-blur transition hover:bg-white active:scale-95"
          aria-label="重置视角"
        >
          复位
        </button>
        <button
          type="button"
          onClick={() => setShowGrid((v) => !v)}
          className={`h-9 w-9 rounded-lg text-[10px] font-semibold shadow-md backdrop-blur transition active:scale-95 ${
            showGrid ? 'bg-white/90 text-slate-600' : 'bg-white/50 text-slate-400'
          }`}
          aria-label="切换网格"
        >
          网格
        </button>
      </div>

      {placingTypeId && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
          放置模式 · 点击地面放置建筑（绿色可放 / 红色不可放）· 按 Esc 取消
        </div>
      )}

      {buildings.length === 0 && (
        <button
          type="button"
          onClick={onOpenShop}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-emerald-500 active:scale-95"
        >
          开始建造你的第一座房子 →
        </button>
      )}
    </div>
  );
}
