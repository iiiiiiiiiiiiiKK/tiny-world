import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  parseDateKey,
  periodKey,
  taskActiveOn,
  toDateKey,
  weekKey,
} from './date';

describe('date keys', () => {
  it('formats yyyy-mm-dd', () => {
    expect(toDateKey(new Date(2026, 10, 8))).toBe('2026-11-08');
  });

  it('parses yyyy-mm-dd back to the same day', () => {
    const d = parseDateKey('2026-11-08');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(8);
  });

  it('adds days across month boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('computes day differences', () => {
    expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7);
    expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7);
  });
});

describe('period keys prevent duplicate rewards', () => {
  it('daily tasks use the date', () => {
    expect(periodKey('daily', '2026-11-08')).toBe('d:2026-11-08');
    expect(periodKey('daily', '2026-11-08')).not.toBe(periodKey('daily', '2026-11-09'));
  });

  it('weekly tasks share a key across the same week', () => {
    // 2026-11-02 是周一，2026-11-08 是周日，属于同一 ISO 周
    expect(periodKey('weekly', '2026-11-02')).toBe(periodKey('weekly', '2026-11-08'));
    expect(periodKey('weekly', '2026-11-02')).not.toBe(periodKey('weekly', '2026-11-09'));
  });

  it('one-off tasks always share the same key', () => {
    expect(periodKey('once', '2026-11-08')).toBe(periodKey('once', '2026-12-01'));
  });

  it('custom tasks differ per day', () => {
    expect(periodKey('custom', '2026-11-02', [1])).not.toBe(
      periodKey('custom', '2026-11-03', [1]),
    );
  });

  it('weekKey is stable within a week', () => {
    expect(weekKey('2026-11-02')).toBe(weekKey('2026-11-08'));
  });
});

describe('task activity windows', () => {
  it('daily tasks are always active', () => {
    expect(taskActiveOn({ repeatType: 'daily', repeatDays: [] }, '2026-11-08')).toBe(true);
  });

  it('custom tasks respect selected weekdays', () => {
    // 2026-11-08 是周日 (0)
    expect(taskActiveOn({ repeatType: 'custom', repeatDays: [0] }, '2026-11-08')).toBe(true);
    expect(taskActiveOn({ repeatType: 'custom', repeatDays: [1] }, '2026-11-08')).toBe(false);
  });
});
