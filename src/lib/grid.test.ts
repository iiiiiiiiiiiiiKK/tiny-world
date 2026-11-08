import { describe, expect, it } from 'vitest';
import {
  TILE_H,
  TILE_W,
  addResources,
  canPlace,
  cellToScreen,
  conflictsWith,
  footprint,
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
  return { id, typeId, x, y, level: 1, placedAt: 0, variant: 0 };
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

describe('isometric projection', () => {
  it('round-trips cell ↔ screen exactly', () => {
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
