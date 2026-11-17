import { describe, expect, it } from 'vitest';
import { calculateRatio } from './methods.js';
import { elapsedSeconds } from '../hooks/useBrewTimer.js';

describe('kalkulator rasio', () => {
  it('menghitung air dari dosis dan rasio', () => {
    expect(calculateRatio({ mode: 'water', dose: 15, ratio: 16 })).toEqual({ dose: 15, water: 240 });
  });
  it('menghitung dosis dari volume air', () => {
    expect(calculateRatio({ mode: 'dose', water: 300, ratio: 15 })).toEqual({ water: 300, dose: 20 });
  });
  it('menggunakan waktu aktual agar jeda tab tidak menggeser timer', () => {
    expect(elapsedSeconds(1000, 12, 61000)).toBe(72);
    expect(elapsedSeconds(1000, 72, 1000)).toBe(72);
  });
});
