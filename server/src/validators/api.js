import { z } from 'zod';

export const beanSchema = z.object({
  name: z.string().trim().min(2).max(80), origin: z.string().trim().min(1), roaster: z.string().optional().or(z.literal('')),
  process: z.enum(['washed', 'natural', 'honey', 'anaerobic', 'lainnya']).optional(),
  roastLevel: z.enum(['light', 'medium', 'dark']).optional(), variety: z.string().optional().or(z.literal('')),
  altitudeMasl: z.preprocess(value => value === '' || value === null ? undefined : value, z.coerce.number().min(0).max(3000).optional()),
  roastDate: z.preprocess(value => value === '' || value === null ? undefined : value, z.coerce.date().optional()),
  flavorNotes: z.array(z.string()).max(8).optional(),
  imageUrl: z.union([z.literal(''), z.string().url().refine(value => /^https?:/i.test(value), 'URL harus http atau https')]).optional(),
  notes: z.string().max(500).optional().or(z.literal(''))
});

const optionalNumber = schema => z.preprocess(value => value === '' || value === null ? undefined : value, schema.optional());
const cuppingSchema = z.object({
  aroma: z.coerce.number().int().min(1).max(10).optional(),
  flavor: z.coerce.number().int().min(1).max(10).optional(),
  acidity: z.coerce.number().int().min(1).max(10).optional(),
  body: z.coerce.number().int().min(1).max(10).optional(),
  sweetness: z.coerce.number().int().min(1).max(10).optional(),
  aftertaste: z.coerce.number().int().min(1).max(10).optional(),
  balance: z.coerce.number().int().min(1).max(10).optional()
}).strict();

export const brewSchema = z.object({
  bean: z.string().min(1), method: z.enum(['v60', 'french_press', 'aeropress', 'espresso', 'tubruk', 'moka_pot', 'cold_brew']),
  doseGrams: z.coerce.number().min(5).max(100), waterGrams: z.coerce.number().min(20).max(2000),
  waterTempC: optionalNumber(z.coerce.number().min(0).max(100)),
  grindSize: z.enum(['extra_fine', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse']).optional().or(z.literal('')),
  grinderSetting: z.string().optional().or(z.literal('')), brewTimeSeconds: optionalNumber(z.coerce.number().min(0).max(86400)),
  tdsPercent: optionalNumber(z.coerce.number().min(0).max(20)),
  rating: z.coerce.number().int().min(1).max(5), cupping: cuppingSchema.optional(),
  tasteTags: z.array(z.string()).max(8).optional(), notes: z.string().max(1000).optional().or(z.literal('')),
  isFavorite: z.boolean().optional(), brewedAt: z.coerce.date().optional()
});
