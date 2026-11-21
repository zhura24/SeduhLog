import { describe, expect, it } from 'vitest';
import { getBeanImage, prepareBeanImage } from './beanImages.js';

describe('gambar biji kopi', () => {
  it('uses the selected image URL', () => {
    expect(getBeanImage({ imageUrl: 'https://example.com/coffee.jpg' }))
      .toBe('https://example.com/coffee.jpg');
  });

  it('does not assign an image when the user has not selected one', () => {
    expect(getBeanImage({ name: 'Gayo Honey', process: 'honey', roastLevel: 'dark' }))
      .toBe('');
  });

  it('treats a blank image URL as no image', () => {
    expect(getBeanImage({ imageUrl: '  ' })).toBe('');
  });
});

describe('persiapan foto biji kopi', () => {
  it('menolak format file yang tidak didukung', async () => {
    await expect(prepareBeanImage({ type: 'image/svg+xml', size: 100 }))
      .rejects.toThrow('Pilih foto berformat JPG, PNG, atau WebP.');
  });

  it('menolak file yang lebih besar dari batas unggah', async () => {
    await expect(prepareBeanImage({ type: 'image/jpeg', size: 8 * 1024 * 1024 + 1 }))
      .rejects.toThrow('Ukuran foto maksimal 8 MB.');
  });
});
