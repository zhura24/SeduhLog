import { z } from 'zod';

export const beanSchema = z.object({
  name: z.string().trim().min(2, 'Nama Biji Kopi minimal 2 karakter').max(80, 'Nama Biji Kopi maksimal 80 karakter'),
  origin: z.string().trim().min(1, 'Asal Biji Kopi wajib diisi'),
  roaster: z.string().optional().or(z.literal('')),
  process: z.enum(['washed', 'natural', 'honey', 'anaerobic', 'lainnya'], { errorMap: () => ({ message: 'Pilih proses pengolahan yang tersedia' }) }).optional(),
  roastLevel: z.enum(['light', 'medium', 'dark'], { errorMap: () => ({ message: 'Pilih level sangrai yang tersedia' }) }).optional(),
  variety: z.string().optional().or(z.literal('')),
  altitudeMasl: z.preprocess(value => value === '' || value === null ? undefined : value,
    z.coerce.number({ invalid_type_error: 'Ketinggian harus berupa angka' }).min(0, 'Ketinggian minimal 0 mdpl').max(3000, 'Ketinggian maksimal 3000 mdpl').optional()),
  roastDate: z.preprocess(value => value === '' || value === null ? undefined : value,
    z.coerce.date({ invalid_type_error: 'Tanggal sangrai tidak valid' }).optional()),
  flavorNotes: z.array(z.string()).max(8, 'Catatan rasa maksimal 8 pilihan').optional(),
  imageUrl: z.union([
    z.literal(''),
    z.string().url('URL gambar tidak valid').refine(value => /^https?:/i.test(value), 'URL gambar harus menggunakan http atau https')
  ]).optional(),
  notes: z.string().max(500, 'Catatan tambahan maksimal 500 karakter').optional().or(z.literal(''))
});

const optionalNumber = schema => z.preprocess(value => value === '' || value === null ? undefined : value, schema.optional());
const cuppingSchema = z.object({
  aroma: z.coerce.number().int().min(1, 'Nilai aroma minimal 1').max(10, 'Nilai aroma maksimal 10').optional(),
  flavor: z.coerce.number().int().min(1, 'Nilai rasa minimal 1').max(10, 'Nilai rasa maksimal 10').optional(),
  acidity: z.coerce.number().int().min(1, 'Nilai keasaman minimal 1').max(10, 'Nilai keasaman maksimal 10').optional(),
  body: z.coerce.number().int().min(1, 'Nilai body minimal 1').max(10, 'Nilai body maksimal 10').optional(),
  sweetness: z.coerce.number().int().min(1, 'Nilai kemanisan minimal 1').max(10, 'Nilai kemanisan maksimal 10').optional(),
  aftertaste: z.coerce.number().int().min(1, 'Nilai aftertaste minimal 1').max(10, 'Nilai aftertaste maksimal 10').optional(),
  balance: z.coerce.number().int().min(1, 'Nilai keseimbangan minimal 1').max(10, 'Nilai keseimbangan maksimal 10').optional()
}).strict();

export const brewSchema = z.object({
  bean: z.string().min(1, 'Pilih Biji Kopi untuk Seduhan ini'),
  method: z.enum(['v60', 'french_press', 'aeropress', 'espresso', 'tubruk', 'moka_pot', 'cold_brew'],
    { errorMap: () => ({ message: 'Pilih metode seduh yang tersedia' }) }),
  doseGrams: z.coerce.number({ invalid_type_error: 'Dosis harus berupa angka' }).min(5, 'Dosis minimal 5 gram').max(100, 'Dosis maksimal 100 gram'),
  waterGrams: z.coerce.number({ invalid_type_error: 'Jumlah air harus berupa angka' }).min(20, 'Jumlah air minimal 20 gram').max(2000, 'Jumlah air maksimal 2000 gram'),
  waterTempC: optionalNumber(z.coerce.number({ invalid_type_error: 'Suhu air harus berupa angka' }).min(0, 'Suhu air minimal 0°C').max(100, 'Suhu air maksimal 100°C')),
  grindSize: z.enum(['extra_fine', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse'],
    { errorMap: () => ({ message: 'Pilih ukuran giling yang tersedia' }) }).optional().or(z.literal('')),
  grinderSetting: z.string().optional().or(z.literal('')),
  brewTimeSeconds: optionalNumber(z.coerce.number({ invalid_type_error: 'Waktu seduh harus berupa angka' }).min(0, 'Waktu seduh minimal 0 detik').max(86400, 'Waktu seduh maksimal 86400 detik')),
  tdsPercent: optionalNumber(z.coerce.number({ invalid_type_error: 'TDS harus berupa angka' }).min(0, 'TDS minimal 0%').max(20, 'TDS maksimal 20%')),
  rating: z.coerce.number({ invalid_type_error: 'Pilih rating Seduhan' }).int().min(1, 'Rating minimal 1 bintang').max(5, 'Rating maksimal 5 bintang'),
  cupping: cuppingSchema.optional(),
  tasteTags: z.array(z.string()).max(8, 'Tag rasa maksimal 8 pilihan').optional(),
  notes: z.string().max(1000, 'Catatan Seduhan maksimal 1000 karakter').optional().or(z.literal('')),
  isFavorite: z.boolean().optional(), brewedAt: z.coerce.date().optional()
});
