import type { BuildingArt, BuildingShape } from '../types';

/**
 * 程序化像素美术渲染。
 * 所有建筑都用统一的 Canvas 像素绘制 API 画出，保证风格一致且无需外部素材。
 */

export interface SpriteContext {
  ctx: CanvasRenderingContext2D;
  /** 建筑底面中心的屏幕坐标 */
  originX: number;
  originY: number;
  /** 每像素单位的屏幕缩放 */
  scale: number;
  /** 建筑变体（0-3），用于制造细微差异 */
  variant: number;
}

/** 画一个像素方块（带可选高光/阴影） */
export function px(
  c: SpriteContext,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const { ctx, scale, originX, originY } = c;
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(originX + x * scale),
    Math.round(originY + y * scale),
    Math.max(1, Math.round(w * scale)),
    Math.max(1, Math.round(h * scale)),
  );
}

/** 在等距立方体上绘制：顶面 + 左面 + 右面 */
export function isoBlock(
  c: SpriteContext,
  cx: number,
  baseY: number,
  halfW: number,
  height: number,
  top: string,
  left: string,
  right: string,
) {
  const { ctx, scale, originX, originY } = c;
  const hw = halfW;
  const hh = halfW / 2;

  const drawPoly = (pts: [number, number][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([pxp, pyp], i) => {
      const sx = originX + pxp * scale;
      const sy = originY + pyp * scale;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
  };

  // 右面
  drawPoly(
    [
      [cx, baseY - height - hh],
      [cx + hw, baseY - height],
      [cx + hw, baseY],
      [cx, baseY + hh],
    ],
    right,
  );
  // 左面
  drawPoly(
    [
      [cx - hw, baseY - height],
      [cx, baseY - height - hh],
      [cx, baseY + hh],
      [cx - hw, baseY],
    ],
    left,
  );
  // 顶面
  drawPoly(
    [
      [cx, baseY - height - 2 * hh],
      [cx + hw, baseY - height - hh],
      [cx, baseY - height],
      [cx - hw, baseY - height - hh],
    ],
    top,
  );
}

/** 绘制等距菱形地面块 */
export function isoTile(
  c: SpriteContext,
  cx: number,
  cy: number,
  halfW: number,
  top: string,
  sideL: string,
  sideR: string,
  depth = 3,
) {
  const { ctx, scale, originX, originY } = c;
  const hh = halfW / 2;
  const poly = (pts: [number, number][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([pxp, pyp], i) => {
      const sx = originX + pxp * scale;
      const sy = originY + pyp * scale;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
  };
  // 侧面厚度
  poly(
    [
      [cx - halfW, cy],
      [cx, cy + hh],
      [cx + halfW, cy],
      [cx + halfW, cy + depth],
      [cx, cy + hh + depth],
      [cx - halfW, cy + depth],
    ],
    sideR,
  );
  // 顶面
  poly(
    [
      [cx, cy - hh],
      [cx + halfW, cy],
      [cx, cy + hh],
      [cx - halfW, cy],
    ],
    top,
  );
  void sideL;
}

function shade(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(m[1], 16) + amount);
  const g = clamp(parseInt(m[2], 16) + amount);
  const b = clamp(parseInt(m[3], 16) + amount);
  return `rgb(${r},${g},${b})`;
}

/** 在墙面上画窗户（等距左面/右面各一组） */
function drawWindows(c: SpriteContext, art: BuildingArt, halfW: number, wallTop: number) {
  const count = art.windows ?? 0;
  if (count <= 0) return;
  const { ctx, scale, originX, originY } = c;
  const winW = Math.max(2, Math.round(halfW / 3));
  const winH = 4;

  const perFace = Math.max(1, Math.ceil(count / 2));
  for (let f = 0; f < 2; f++) {
    const dir = f === 0 ? -1 : 1;
    for (let i = 0; i < perFace; i++) {
      const t = (i + 1) / (perFace + 1);
      const x = dir * halfW * 0.5 * t;
      const y = wallTop + 5 + (i % 2) * 4;
      // 右面窗口
      if (dir === 1) {
        px(c, x - winW / 2, y, winW, winH, art.accent);
        px(c, x - winW / 2, y, winW, 1, shade(art.accent, -30));
      } else {
        px(c, x - winW / 2, y, winW, winH, shade(art.accent, -18));
        px(c, x - winW / 2, y, winW, 1, shade(art.accent, -40));
      }
    }
  }
  void ctx;
  void originX;
  void originY;
  void scale;
}

function drawRoof(
  c: SpriteContext,
  art: BuildingArt,
  halfW: number,
  wallTop: number,
) {
  const { ctx, scale, originX, originY } = c;
  const style = art.style ?? 'gable';
  const roofH = Math.max(6, Math.round(art.height * 0.45));

  const poly = (pts: [number, number][], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(([pxp, pyp], i) => {
      const sx = originX + pxp * scale;
      const sy = originY + pyp * scale;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.fill();
  };

  if (style === 'gable') {
    // 人字屋顶：左坡 + 右坡
    poly(
      [
        [-halfW, wallTop],
        [0, wallTop - roofH],
        [0, wallTop - roofH + 2],
        [-halfW, wallTop + 2],
      ],
      art.roofDark,
    );
    poly(
      [
        [0, wallTop - roofH],
        [halfW, wallTop],
        [halfW, wallTop + 2],
        [0, wallTop - roofH + 2],
      ],
      art.roof,
    );
    // 屋脊
    px(c, -1, wallTop - roofH, 2, 2, shade(art.roof, 30));
  } else if (style === 'flat') {
    // 平顶 + 女儿墙
    poly(
      [
        [-halfW, wallTop],
        [0, wallTop - halfW / 2],
        [halfW, wallTop],
        [0, wallTop + halfW / 2],
      ],
      art.roof,
    );
    poly(
      [
        [-halfW, wallTop],
        [0, wallTop + halfW / 2],
        [halfW, wallTop],
        [halfW, wallTop + 1.5],
        [0, wallTop + halfW / 2 + 1.5],
        [-halfW, wallTop + 1.5],
      ],
      art.roofDark,
    );
  } else if (style === 'steep') {
    const rh = roofH * 1.4;
    poly(
      [
        [-halfW, wallTop],
        [0, wallTop - rh],
        [0, wallTop - rh + 2],
        [-halfW, wallTop + 2],
      ],
      art.roofDark,
    );
    poly(
      [
        [0, wallTop - rh],
        [halfW, wallTop],
        [halfW, wallTop + 2],
        [0, wallTop - rh + 2],
      ],
      art.roof,
    );
  } else if (style === 'round') {
    poly(
      [
        [-halfW, wallTop],
        [0, wallTop - roofH],
        [halfW, wallTop],
        [0, wallTop + halfW / 2],
      ],
      art.roof,
    );
    // 弧形高光
    for (let i = -halfW; i <= halfW; i++) {
      const t = i / halfW;
      const yy = wallTop - roofH * Math.sqrt(Math.max(0, 1 - t * t));
      px(c, i, yy, 1, 1, art.roofDark);
    }
  } else if (style === 'dome') {
    const rh = roofH * 1.1;
    for (let i = -halfW; i <= halfW; i++) {
      const t = i / halfW;
      const yy = wallTop - rh * Math.sqrt(Math.max(0, 1 - t * t));
      px(c, i, yy, 1, 2, art.roof);
      px(c, i, yy + 2, 1, 1, art.roofDark);
    }
    px(c, -1, wallTop - rh - 2, 2, 2, art.accent);
  }
}

function drawDetail(c: SpriteContext, art: BuildingArt, halfW: number, wallTop: number) {
  switch (art.detail) {
    case 'chimney':
      px(c, halfW * 0.45, wallTop - art.height * 0.5 - 4, 3, 6, art.wallDark);
      px(c, halfW * 0.45, wallTop - art.height * 0.5 - 4, 3, 1, shade(art.wallDark, 25));
      break;
    case 'antenna':
      px(c, 0, wallTop - art.height * 0.5 - 10, 1, 8, '#5a6470');
      px(c, -1, wallTop - art.height * 0.5 - 12, 3, 2, '#e05a5a');
      break;
    case 'dome':
      px(c, -halfW * 0.4, wallTop - 6, halfW * 0.8, 2, art.roofDark);
      break;
    case 'flag':
      px(c, halfW * 0.5, wallTop - 12, 1, 8, '#6b6257');
      px(c, halfW * 0.5, wallTop - 12, 5, 3, '#d8503f');
      break;
    case 'sign':
      px(c, -halfW * 0.7, wallTop + 2, halfW * 1.4, 4, art.accent);
      px(c, -halfW * 0.7, wallTop + 2, halfW * 1.4, 1, shade(art.accent, 30));
      break;
    case 'spire':
      px(c, 0, wallTop - art.height * 0.5 - 8, 1, 6, art.roofDark);
      px(c, -1, wallTop - art.height * 0.5 - 9, 3, 1, art.accent);
      break;
    default:
      break;
  }
}

/**
 * 绘制一个建筑。halfW 为建筑底面菱形半宽（像素）。
 */
export function drawBuilding(
  c: SpriteContext,
  art: BuildingArt,
  halfW: number,
) {
  const { ctx } = c;
  ctx.save();

  switch (art.shape as BuildingShape) {
    case 'box': {
      const h = art.height;
      isoBlock(c, 0, 0, halfW, h, art.roof, art.wall, art.wallDark);
      // 墙体亮面描边
      px(c, -halfW, -h, halfW, 1, shade(art.wall, 18));
      drawWindows(c, art, halfW, -h);
      // 门
      const doorW = Math.max(3, Math.round(halfW * 0.5));
      px(c, -doorW / 2, -Math.round(h * 0.55), doorW, Math.round(h * 0.55), art.accent);
      px(c, -doorW / 2, -Math.round(h * 0.55), doorW, 1, shade(art.accent, 25));
      drawRoof(c, art, halfW, -h);
      drawDetail(c, art, halfW, -h);
      break;
    }
    case 'tree': {
      const h = art.height;
      px(c, -1, -h * 0.5, 3, h * 0.5, art.wall);
      px(c, 1, -h * 0.5, 1, h * 0.5, art.wallDark);
      // 树冠（三层）
      const r = halfW * 0.9;
      px(c, -r, -h - r * 0.55, r * 2, r * 0.8, art.roof);
      px(c, -r * 0.8, -h - r * 1.1, r * 1.6, r * 0.75, art.roof);
      px(c, -r * 0.55, -h - r * 1.5, r * 1.1, r * 0.6, art.trim);
      px(c, -r, -h - r * 0.55, r * 0.9, 1, art.roofDark);
      break;
    }
    case 'pine': {
      const h = art.height;
      px(c, -1, -h * 0.35, 2, h * 0.35, art.wall);
      // 三层锥形
      px(c, -halfW * 0.9, -h * 0.75, halfW * 1.8, h * 0.28, art.roof);
      px(c, -halfW * 0.65, -h * 0.95, halfW * 1.3, h * 0.28, art.roof);
      px(c, -halfW * 0.4, -h * 1.12, halfW * 0.8, h * 0.26, art.trim);
      break;
    }
    case 'shrub': {
      const h = art.height;
      px(c, -halfW * 0.8, -h, halfW * 1.6, h, art.roof);
      px(c, -halfW * 0.8, -h, halfW * 1.6, 1, art.roofDark);
      px(c, -halfW * 0.4, -h - 1, 2, 2, art.trim);
      px(c, halfW * 0.1, -h - 1, 2, 2, art.accent);
      break;
    }
    case 'rock': {
      const h = art.height;
      px(c, -halfW * 0.75, -h, halfW * 1.5, h, art.roof);
      px(c, -halfW * 0.75, -h, halfW * 0.6, h, art.trim);
      px(c, -halfW * 0.75, -1, halfW * 1.5, 1, art.roofDark);
      break;
    }
    case 'lamp': {
      const h = art.height;
      px(c, -1, -h, 2, h, art.wall);
      px(c, 0, -h, 1, h, art.wallDark);
      px(c, -2, -h - 3, 5, 3, art.trim);
      px(c, -1, -h - 2, 3, 2, art.accent);
      break;
    }
    case 'fountain': {
      const h = art.height;
      // 池子
      isoTile(c, 0, 0, halfW, art.wall, art.wallDark, art.roofDark, 2);
      px(c, -halfW * 0.6, -3, halfW * 1.2, 4, art.wallDark);
      px(c, -halfW * 0.5, -6, halfW, 3, art.wall);
      px(c, -1, -10, 2, 5, art.trim);
      px(c, -2, -12, 4, 3, art.accent);
      void h;
      break;
    }
    case 'statue': {
      const h = art.height;
      px(c, -halfW * 0.7, -4, halfW * 1.4, 4, art.wall);
      px(c, -halfW * 0.7, -5, halfW * 1.4, 1, art.wallDark);
      px(c, -2, -h, 4, h - 4, art.wall);
      px(c, -2, -h, 4, 2, art.trim);
      px(c, -3, -h + 3, 2, 5, art.wallDark);
      px(c, 1, -h + 3, 2, 5, art.wallDark);
      break;
    }
    case 'bench': {
      const h = art.height;
      px(c, -halfW * 0.8, -h, halfW * 1.6, 2, art.roof);
      px(c, -halfW * 0.8, -h, halfW * 1.6, 1, art.trim);
      px(c, -halfW * 0.6, -h + 2, 2, h - 2, art.trim);
      px(c, halfW * 0.4, -h + 2, 2, h - 2, art.trim);
      break;
    }
    case 'road': {
      // 一格石板路
      isoTile(c, 0, 0, halfW, art.roof, art.roofDark, art.roofDark, 1);
      px(c, -halfW * 0.5, -1, halfW, 1, art.trim);
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

/** 建筑在地面的投影（椭圆/菱形阴影） */
export function drawShadow(c: SpriteContext, halfW: number) {
  const { ctx, scale, originX, originY } = c;
  ctx.save();
  ctx.fillStyle = 'rgba(40, 60, 40, 0.18)';
  ctx.beginPath();
  const hh = halfW / 2;
  ctx.moveTo(originX, originY - hh * scale);
  ctx.lineTo(originX + halfW * scale, originY);
  ctx.lineTo(originX, originY + hh * scale);
  ctx.lineTo(originX - halfW * scale, originY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
