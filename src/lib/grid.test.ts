import { describe, expect, it } from 'vitest';
import {
  TILE_H,
  TILE_W,
  addResources,
  canPlace,
  canRotate,
  cellToScreen,
  conflictsWith,
  effectiveSize,
  footprint,
  nextRotation,
  resourcesSatisfy,
  screenToCell,
  sellValue,
  subtractResources,
  upgradeCostFor,
  withinExtent,
} from './grid';
import { buildingType } from '../config/buildings';
import type { BuildingInstance } from '../types';

function b(typeId: string, x: number, y: number, id = `${typeId}-${x}-${y}`): BuildingInstance {
  return { id, typeId, x, y, level: 1, placedAt: 0, variant: 0, rotation: 0 };
}

describe('grid footprint', () => {
  it('computes w×h footprint', () => {
    const type = buildingType('tech')!;
    expect(type.size).toEqual({ w: 3, h: 2 });
    const cells = footprint(type, 1, 2);
    expect(cells).toHaveLength(6);
    expect(cells[0]).toEqual({ x: 1, y: 2 });
    expect(cells[5]).toEqual({ x: 3, y: 3 });
  });

  it('detects overlap between 1x1 buildings', () => {
    expect(conflictsWith([b('cabin', 2, 2)], { typeId: 'tree', x: 2, y: 2 })).toBe(true);
    expect(conflictsWith([b('cabin', 2, 2)], { typeId: 'tree', x: 3, y: 2 })).toBe(false);
  });

  it('detects overlap for multi-cell buildings', () => {
    const list = [b('library', 0, 0)];
    // library 占 2x2 → (0,0)(1,0)(0,1)(1,1)
    expect(conflictsWith(list, { typeId: 'tree', x: 1, y: 1 })).toBe(true);
    expect(conflictsWith(list, { typeId: 'tree', x: 2, y: 2 })).toBe(false);
  });

  it('ignores self when moving', () => {
    const list = [b('cabin', 2, 2)];
    expect(conflictsWith(list, { typeId: 'cabin', x: 3, y: 2 }, 'cabin-2-2')).toBe(false);
  });
});

describe('placement validation', () => {
  it('rejects out-of-extent placement', () => {
    expect(canPlace([], { typeId: 'cabin', x: 6, y: 0 }, 6)).toBe(false);
    expect(canPlace([], { typeId: 'cabin', x: 5, y: 5 }, 6)).toBe(true);
  });

  it('rejects placement that overflows the extent for multi-cell buildings', () => {
    expect(canPlace([], { typeId: 'library', x: 5, y: 0 }, 6)).toBe(false);
  });

  it('withinExtent boundaries', () => {
    expect(withinExtent(0, 0, 6)).toBe(true);
    expect(withinExtent(-1, 0, 6)).toBe(false);
    expect(withinExtent(6, 0, 6)).toBe(false);
  });
});

describe('resource helpers', () => {
  it('checks affordability', () => {
    expect(resourcesSatisfy({ coins: 10, wood: 5, stone: 0 }, { coins: 10, wood: 5 })).toBe(true);
    expect(resourcesSatisfy({ coins: 9, wood: 5, stone: 0 }, { coins: 10, wood: 5 })).toBe(false);
  });

  it('adds and subtracts without going negative on subtract input', () => {
    expect(addResources({ coins: 1, wood: 2, stone: 3 }, { coins: 2 })).toEqual({
      coins: 3,
      wood: 2,
      stone: 3,
    });
    expect(subtractResources({ coins: 10, wood: 10, stone: 10 }, { coins: 4, wood: 3 })).toEqual({
      coins: 6,
      wood: 7,
      stone: 10,
    });
  });
});

describe('upgrade & sell economics', () => {
  it('scales upgrade cost with level', () => {
    const type = buildingType('cabin')!;
    const l1 = upgradeCostFor(type, 1);
    const l2 = upgradeCostFor(type, 2);
    expect(l1.wood).toBe(type.upgradeCost.wood);
    expect(l2.wood!).toBeGreaterThan(l1.wood!);
  });

  it('sell value is a fraction of total spend', () => {
    const type = buildingType('cabin')!;
    const v = sellValue(type, 1);
    expect(v.coins).toBe(Math.floor((type.cost.coins ?? 0) * type.sellRatio));
    expect(v.wood).toBe(Math.floor((type.cost.wood ?? 0) * type.sellRatio));
  });

  it('sell value grows with upgrades', () => {
    const type = buildingType('cabin')!;
    expect(sellValue(type, 3).wood).toBeGreaterThan(sellValue(type, 1).wood);
  });
});

describe('rotation', () => {
  it('only non-square buildings can rotate', () => {
    expect(canRotate(buildingType('cabin')!)).toBe(false); // 1×1
    expect(canRotate(buildingType('shop')!)).toBe(true); // 2×1
    expect(canRotate(buildingType('tech')!)).toBe(true); // 3×2
  });

  it('odd rotations swap width and height', () => {
    const shop = buildingType('shop')!; // 2×1
    expect(effectiveSize(shop, 0)).toEqual({ w: 2, h: 1 });
    expect(effectiveSize(shop, 1)).toEqual({ w: 1, h: 2 });
    expect(effectiveSize(shop, 2)).toEqual({ w: 2, h: 1 });
    expect(effectiveSize(shop, 3)).toEqual({ w: 1, h: 2 });
  });

  it('footprint respects rotation', () => {
    const shop = buildingType('shop')!;
    expect(footprint(shop, 0, 0, 0)).toHaveLength(2);
    expect(footprint(shop, 0, 0, 1)).toHaveLength(2);
    // 旋转 90° 后是竖直的两格
    expect(footprint(shop, 0, 0, 1)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ]);
  });

  it('rotated footprint changes collision results', () => {
    const shop = buildingType('shop')!;
    const list = [b('shop', 0, 0)]; // 占 (0,0)(1,0)
    // 目标格 (0,1)：未旋转时 2×1 会占 (0,1)(1,1) 不冲突
    expect(conflictsWith(list, { typeId: 'shop', x: 0, y: 1, rotation: 0 })).toBe(false);
    // 旋转 90° 后是 1×2 占 (0,1)(0,2)，也不冲突
    expect(conflictsWith(list, { typeId: 'shop', x: 0, y: 1, rotation: 1 })).toBe(false);
    // 但放到 (1,0) 旋转 90° 会占 (1,0)(1,1)，与 (1,0) 冲突
    expect(conflictsWith(list, { typeId: 'shop', x: 1, y: 0, rotation: 1 })).toBe(true);
    void shop;
  });

  it('rotation cycling wraps 0→1→2→3→0', () => {
    const shop = buildingType('shop')!;
    expect(nextRotation(shop, 0)).toBe(1);
    expect(nextRotation(shop, 1)).toBe(2);
    expect(nextRotation(shop, 2)).toBe(3);
    expect(nextRotation(shop, 3)).toBe(0);
  });

  it('square buildings never rotate', () => {
    const cabin = buildingType('cabin')!;
    expect(nextRotation(cabin, 0)).toBe(0);
  });

  it('rotated placement respects extent bounds', () => {
    // 3×2 科技中心旋转后在 6 格边界内仍然受限
    expect(canPlace([], { typeId: 'tech', x: 4, y: 0, rotation: 0 }, 6)).toBe(false);
    expect(canPlace([], { typeId: 'tech', x: 0, y: 4, rotation: 1 }, 6)).toBe(false);
    expect(canPlace([], { typeId: 'tech', x: 4, y: 0, rotation: 1 }, 6)).toBe(true);
  });
});

describe('isometric projection', () => {  it('round-trips cell ↔ screen exactly', () => {
    for (const [cx, cy] of [
      [0, 0],
      [3, 5],
      [7, 2],
      [10, 10],
      [15, 0],
      [0, 15],
    ] as const) {
      const s = cellToScreen(cx, cy, 0, 0, 1);
      const back = screenToCell(s.x, s.y, 0, 0, 1);
      expect(back.x, `x at ${cx},${cy}`).toBe(cx);
      expect(back.y, `y at ${cx},${cy}`).toBe(cy);
    }
  });

  it('round-trips with offset and zoom applied', () => {
    const ox = 137.5;
    const oy = -42.25;
    const zoom = 1.85;
    for (const [cx, cy] of [
      [0, 0],
      [4, 9],
      [13, 3],
    ] as const) {
      const s = cellToScreen(cx, cy, ox, oy, zoom);
      const back = screenToCell(s.x, s.y, ox, oy, zoom);
      expect(back.x).toBe(cx);
      expect(back.y).toBe(cy);
    }
  });

  it('uses a 2:1 tile ratio', () => {
    expect(TILE_W / TILE_H).toBe(2);
  });
});
