import { describe, expect, it } from 'vitest';
import { calculateRoomEstimate, formatINR } from './roomEstimate.js';

describe('room estimate calculations', () => {
  const fixedPrice = { min: 100, max: 100 };

  it('calculates room area in square feet from feet dimensions', () => {
    const result = calculateRoomEstimate({ length: '12', width: '10', rate: '100', price: fixedPrice });

    expect(result.valid).toBe(true);
    expect(result.area).toBe(120);
    expect(result.billableArea).toBe(120);
  });

  it('adds an adjustable wastage allowance to the billable material area', () => {
    const result = calculateRoomEstimate({
      length: '12', width: '10', rate: '100', price: fixedPrice, wastagePercent: '10',
    });

    expect(result.wastageArea).toBe(12);
    expect(result.billableArea).toBe(132);
    expect(result.materialCost).toBe(13200);
  });

  it('calculates a single-price material estimate', () => {
    const result = calculateRoomEstimate({ length: 10, width: 8, rate: 100, price: fixedPrice });

    expect(result.materialCost).toBe(8000);
    expect(result.rate).toBe(100);
  });

  it('uses the customer-selected rate inside a finite catalog price range', () => {
    const result = calculateRoomEstimate({
      length: 12, width: 10, rate: 95, price: { min: 70, max: 120 },
    });

    expect(result.valid).toBe(true);
    expect(result.materialCost).toBe(11400);
    expect(result.rate).toBe(95);
  });

  it('accepts a chosen rate at or above the lower bound for an open-ended range', () => {
    const result = calculateRoomEstimate({
      length: 1, width: 1, rate: 2400, price: { min: 350, max: null },
    });

    expect(result.valid).toBe(true);
    expect(result.materialCost).toBe(2400);
  });

  it.each([
    ['', '10'],
    ['0', '10'],
    ['-2', '10'],
    ['Infinity', '10'],
    ['not a number', '10'],
  ])('rejects unusable dimensions (%s by %s)', (length, width) => {
    const result = calculateRoomEstimate({ length, width, rate: 100, price: fixedPrice });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeDefined();
    expect(result.materialCost).toBeUndefined();
  });

  it('rejects a rate outside its catalog price range and invalid wastage', () => {
    const result = calculateRoomEstimate({
      length: 10, width: 10, rate: 121, price: { min: 70, max: 120 }, wastagePercent: 101,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.rate).toMatch(/from ₹70 to ₹120/);
    expect(result.errors.wastagePercent).toBeDefined();
  });

  it('formats costs as Indian rupees', () => {
    expect(formatINR(1200)).toContain('₹');
    expect(formatINR(1200)).toContain('1,200');
  });
});
