import { describe, expect, it } from 'vitest';
import { BUILDINGS, buildingType, buildingTypesForLevel } from '../config/buildings';
import { LEVELS, levelFromXp, levelProgress, MAX_LEVEL } from '../config/economy';
import { EVENT_TEMPLATES } from '../config/events';
import { PALETTE } from '../config/palette';

describe('building catalog', () => {
  it('has unique ids', () => {
    const ids = BUILDINGS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every required category', () => {
    const cats = new Set(BUILDINGS.map((b) => b.category));
    expect(cats.has('basic')).toBe(true);
    expect(cats.has('growth')).toBe(true);
    expect(cats.has('advanced')).toBe(true);
    expect(cats.has('decor')).toBe(true);
  });

  it('includes the required building roster', () => {
    const required = [
      'cabin',
      'house',
      'shop',
      'road',
      'lamp',
      'library',
      'school',
      'gym',
      'park',
      'cafe',
      'office',
      'tech',
      'museum',
      'stadium',
      'plaza',
      // 任务书要求但初版缺失的建筑
      'factory',
      'lake',
    ];
    for (const id of required) {
      expect(buildingType(id), `missing building: ${id}`).toBeDefined();
    }
  });

  it('covers all building kinds listed in the product spec', () => {
    // 作品规格中列举的城市元素：房屋/道路/树木/公园/商店/学校/图书馆/工厂/湖泊/装饰物
    const specElements = {
      房屋: ['cabin', 'house'],
      道路: ['road'],
      树木: ['tree', 'pine'],
      公园: ['park'],
      商店: ['shop'],
      学校: ['school'],
      图书馆: ['library'],
      工厂: ['factory'],
      湖泊: ['lake'],
      装饰物: ['shrub', 'rock', 'fountain', 'statue', 'bench', 'lamp'],
    };
    for (const [label, ids] of Object.entries(specElements)) {
      for (const id of ids) {
        expect(buildingType(id), `${label} → ${id}`).toBeDefined();
      }
    }
  });

  it('every building has a positive cost, size, and art definition', () => {
    for (const b of BUILDINGS) {
      const total =
        (b.cost.coins ?? 0) + (b.cost.wood ?? 0) + (b.cost.stone ?? 0);
      expect(total, `${b.id} has no cost`).toBeGreaterThan(0);
      expect(b.size.w).toBeGreaterThan(0);
      expect(b.size.h).toBeGreaterThan(0);
      expect(b.unlockLevel).toBeGreaterThanOrEqual(1);
      expect(b.maxLevel).toBeGreaterThanOrEqual(1);
      expect(b.art.shape).toBeTruthy();
      expect(b.description.length).toBeGreaterThan(0);
    }
  });

  it('cheap decor unlocks early, premium decor is gated', () => {
    const cheap = ['tree', 'shrub', 'rock', 'bench'];
    for (const id of cheap) {
      expect(buildingType(id)!.unlockLevel, id).toBeLessThanOrEqual(2);
    }
    expect(buildingType('fountain')!.unlockLevel).toBeGreaterThanOrEqual(4);
    expect(buildingType('statue')!.unlockLevel).toBeGreaterThanOrEqual(5);
  });

  it('unlocks buildings progressively by level', () => {
    for (const l of LEVELS) {
      const list = buildingTypesForLevel(l.level);
      expect(list.length).toBeGreaterThan(0);
      for (const b of list) expect(b.unlockLevel).toBeLessThanOrEqual(l.level);
    }
  });

  it('advanced buildings require higher levels', () => {
    for (const b of BUILDINGS.filter((x) => x.category === 'advanced')) {
      expect(b.unlockLevel).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('level curve', () => {
  it('starts at level 1 with 0 xp', () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(0).name).toBe('荒地');
  });

  it('increases monotonically', () => {
    let prev = 0;
    for (const l of LEVELS) {
      expect(l.xp).toBeGreaterThanOrEqual(prev);
      prev = l.xp;
    }
  });

  it('maps xp to the right level', () => {
    expect(levelFromXp(119).level).toBe(1);
    expect(levelFromXp(120).level).toBe(2);
    expect(levelFromXp(319).level).toBe(2);
    expect(levelFromXp(320).level).toBe(3);
    expect(levelFromXp(999999).level).toBe(MAX_LEVEL);
  });

  it('progress ratio is bounded 0..1', () => {
    for (const xp of [0, 50, 200, 700, 3000, 100000]) {
      const p = levelProgress(xp);
      expect(p.ratio).toBeGreaterThanOrEqual(0);
      expect(p.ratio).toBeLessThanOrEqual(1);
    }
  });

  it('city extent grows with level', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].extent).toBeGreaterThan(LEVELS[i - 1].extent);
    }
  });
});

describe('event templates', () => {
  it('have unique ids and positive weight', () => {
    const ids = EVENT_TEMPLATES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EVENT_TEMPLATES) {
      expect(e.weight).toBeGreaterThan(0);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.body.length).toBeGreaterThan(0);
      expect(e.reward.coins).toBeGreaterThanOrEqual(0);
    }
  });

  it('no event can break the economy with unbounded coins', () => {
    for (const e of EVENT_TEMPLATES) {
      expect(e.reward.coins).toBeLessThanOrEqual(60);
    }
  });
});

describe('palette', () => {
  it('defines all core colours', () => {
    for (const key of ['grass', 'grassLight', 'grassDark', 'path', 'water', 'roofRed', 'wallCream']) {
      expect(PALETTE[key as keyof typeof PALETTE]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
