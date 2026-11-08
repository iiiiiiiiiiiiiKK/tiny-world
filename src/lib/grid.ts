import type { BuildingInstance, BuildingType, Resources } from '../types';
import { buildingType } from '../config/buildings';

/** 网格坐标 → 像素（等距 2:1 菱形网格） */
export const TILE_W = 32;
export const TILE_H = 16;

export interface Cell {
  x: number;
  y: number;
}

export type Rotation = 0 | 1 | 2 | 3;

/** 旋转后的实际占地：奇数旋转（90°/270°）交换宽高 */
export function effectiveSize(
  type: BuildingType,
  rotation: Rotation = 0,
): { w: number; h: number } {
  return rotation % 2 === 1
    ? { w: type.size.h, h: type.size.w }
    : { w: type.size.w, h: type.size.h };
}

/** 是否允许旋转：只有非正方形占地的建筑旋转才有意义 */
export function canRotate(type: BuildingType): boolean {
  return type.size.w !== type.size.h;
}

/** 旋转到下一个可用角度（正方形建筑直接返回 0） */
export function nextRotation(type: BuildingType, current: Rotation): Rotation {
  if (!canRotate(type)) return 0;
  return (((current + 1) % 4) as Rotation);
}

/** 建筑占用的所有格子（从 x,y 起，按旋转后的 w×h 矩形） */
export function footprint(
  type: BuildingType,
  x: number,
  y: number,
  rotation: Rotation = 0,
): Cell[] {
  const { w, h } = effectiveSize(type, rotation);
  const cells: Cell[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      cells.push({ x: x + dx, y: y + dy });
    }
  }
  return cells;
}

export function buildingFootprint(b: BuildingInstance): Cell[] {
  const type = buildingType(b.typeId);
  if (!type) return [];
  return footprint(type, b.x, b.y, b.rotation ?? 0);
}

/** 同一格是否被两个建筑占用 */
export function collides(a: BuildingInstance, b: BuildingInstance): boolean {
  const ta = buildingType(a.typeId);
  const tb = buildingType(b.typeId);
  if (!ta || !tb) return false;
  const setB = new Set(buildingFootprint(b).map((c) => `${c.x},${c.y}`));
  return buildingFootprint(a).some((c) => setB.has(`${c.x},${c.y}`));
}

/** 目标位置是否与其它建筑冲突 */
export function conflictsWith(
  buildings: BuildingInstance[],
  candidate: { typeId: string; x: number; y: number; rotation?: Rotation },
  ignoreId?: string,
): boolean {
  const type = buildingType(candidate.typeId);
  if (!type) return true;
  const wanted = new Set(
    footprint(type, candidate.x, candidate.y, candidate.rotation ?? 0).map(
      (c) => `${c.x},${c.y}`,
    ),
  );
  for (const b of buildings) {
    if (b.id === ignoreId) continue;
    for (const c of buildingFootprint(b)) {
      if (wanted.has(`${c.x},${c.y}`)) return true;
    }
  }
  return false;
}

/** 是否在可建造范围内（城市范围随等级扩大） */
export function withinExtent(x: number, y: number, extent: number): boolean {
  return x >= 0 && y >= 0 && x < extent && y < extent;
}

export function canPlace(
  buildings: BuildingInstance[],
  candidate: { typeId: string; x: number; y: number; rotation?: Rotation },
  extent: number,
  ignoreId?: string,
): boolean {
  const type = buildingType(candidate.typeId);
  if (!type) return false;
  const { w, h } = effectiveSize(type, candidate.rotation ?? 0);
  if (!withinExtent(candidate.x, candidate.y, extent)) return false;
  if (candidate.x + w > extent || candidate.y + h > extent) return false;
  return !conflictsWith(buildings, candidate, ignoreId);
}

/** 像素坐标 → 网格坐标（等距投影的反变换，与 cellToScreen 严格互逆） */
export function screenToCell(
  sx: number,
  sy: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): Cell {
  const px = (sx - offsetX) / zoom;
  const py = (sy - offsetY) / zoom;
  // a = x - y, b = x + y + 1
  const a = px / (TILE_W / 2);
  const b = py / (TILE_H / 2);
  return { x: Math.floor((a + b - 1) / 2), y: Math.floor((b - a - 1) / 2) };
}

/** 网格坐标 → 屏幕像素（等距菱形中心，与 screenToCell 严格互逆） */
export function cellToScreen(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): { x: number; y: number } {
  const gx = x + 0.5;
  const gy = y + 0.5;
  const px = (gx - gy) * (TILE_W / 2);
  const py = (gx + gy) * (TILE_H / 2);
  return { x: px * zoom + offsetX, y: py * zoom + offsetY };
}

/** 菱形地砖的四个角（屏幕坐标） */
export function tileCorners(
  x: number,
  y: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
) {
  const c = cellToScreen(x, y, offsetX, offsetY, zoom);
  const hw = (TILE_W / 2) * zoom;
  const hh = (TILE_H / 2) * zoom;
  return [
    { x: c.x, y: c.y - hh },
    { x: c.x + hw, y: c.y },
    { x: c.x, y: c.y + hh },
    { x: c.x - hw, y: c.y },
  ];
}

export function resourcesSatisfy(have: Resources, cost: Partial<Resources>): boolean {
  return (
    have.coins >= (cost.coins ?? 0) &&
    have.wood >= (cost.wood ?? 0) &&
    have.stone >= (cost.stone ?? 0)
  );
}

export function subtractResources(have: Resources, cost: Partial<Resources>): Resources {
  return {
    coins: have.coins - (cost.coins ?? 0),
    wood: have.wood - (cost.wood ?? 0),
    stone: have.stone - (cost.stone ?? 0),
  };
}

export function addResources(have: Resources, gain: Partial<Resources>): Resources {
  return {
    coins: have.coins + (gain.coins ?? 0),
    wood: have.wood + (gain.wood ?? 0),
    stone: have.stone + (gain.stone ?? 0),
  };
}

/** 计算升级到下一级所需资源（按等级递增） */
export function upgradeCostFor(type: BuildingType, currentLevel: number): Partial<Resources> {
  const factor = Math.pow(1.8, currentLevel - 1);
  const base = type.upgradeCost;
  const out: Partial<Resources> = {};
  if (base.coins) out.coins = Math.round(base.coins * factor);
  if (base.wood) out.wood = Math.round(base.wood * factor);
  if (base.stone) out.stone = Math.round(base.stone * factor);
  return out;
}

/** 出售返还 */
export function sellValue(type: BuildingType, level: number): Resources {
  const spent: Resources = {
    coins: type.cost.coins ?? 0,
    wood: type.cost.wood ?? 0,
    stone: type.cost.stone ?? 0,
  };
  const levels = level - 1;
  for (let i = 1; i <= levels; i++) {
    const c = upgradeCostFor(type, i);
    spent.coins += c.coins ?? 0;
    spent.wood += c.wood ?? 0;
    spent.stone += c.stone ?? 0;
  }
  return {
    coins: Math.floor(spent.coins * type.sellRatio),
    wood: Math.floor(spent.wood * type.sellRatio),
    stone: Math.floor(spent.stone * type.sellRatio),
  };
}
