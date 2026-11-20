import { describe, expect, it } from 'vitest';
import { prepareBeanImage } from './beanImages.js';

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
