export const methods = [
  { method: 'v60', label: 'V60', ratio: 16, temperature: 94, grind: 'medium_fine', steps: [{ name: 'Bloom', percent: 15, end: 45 }, { name: 'Tuang ke 60%', percent: 60, end: 90 }, { name: 'Tuang ke 100%', percent: 100, end: 135 }, { name: 'Tunggu turun', percent: 100, end: 180 }] },
  { method: 'french_press', label: 'French Press', ratio: 15, temperature: 93, grind: 'coarse', steps: [{ name: 'Tuang semua air', percent: 100, end: 30 }, { name: 'Seduh', percent: 100, end: 240 }, { name: 'Tekan dan sajikan', percent: 100, end: 270 }] },
  { method: 'aeropress', label: 'AeroPress', ratio: 15, temperature: 88, grind: 'medium_fine', steps: [{ name: 'Tuang semua air', percent: 100, end: 20 }, { name: 'Aduk dan seduh', percent: 100, end: 90 }, { name: 'Tekan pelan', percent: 100, end: 120 }] },
  { method: 'espresso', label: 'Espresso', ratio: 2, temperature: 93, grind: 'fine', steps: [{ name: 'Ekstraksi', percent: 100, end: 28 }] },
  { method: 'tubruk', label: 'Kopi Tubruk', ratio: 12, temperature: 95, grind: 'extra_fine', steps: [{ name: 'Tuang air', percent: 100, end: 15 }, { name: 'Diamkan agar ampas turun', percent: 100, end: 240 }] },
  { method: 'moka_pot', label: 'Moka Pot', ratio: 10, temperature: 90, grind: 'medium_fine', steps: [] },
  { method: 'cold_brew', label: 'Cold Brew', ratio: 8, temperature: 4, grind: 'coarse', steps: [] }
];

export const methodLabel = key => methods.find(item => item.method === key)?.label || key || '—';
export const grindLabel = key => ({ extra_fine: 'Ekstra halus', fine: 'Halus', medium_fine: 'Medium halus', medium: 'Sedang', medium_coarse: 'Medium kasar', coarse: 'Kasar' }[key] || '—');

export function calculateRatio({ mode, dose, water, ratio }) {
  const numericRatio = Number(ratio) || 0;
  if (mode === 'water') return { dose: Number(dose) || 0, water: Math.round((Number(dose) || 0) * numericRatio) };
  return { water: Number(water) || 0, dose: numericRatio ? Math.round((Number(water) || 0) / numericRatio * 10) / 10 : 0 };
}
