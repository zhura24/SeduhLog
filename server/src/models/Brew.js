import mongoose from 'mongoose';

const scores = ['aroma', 'flavor', 'acidity', 'body', 'sweetness', 'aftertaste', 'balance'];
const brewSchema = new mongoose.Schema({
  bean: { type: mongoose.Schema.Types.ObjectId, ref: 'Bean', required: true },
  method: { type: String, enum: ['v60', 'french_press', 'aeropress', 'espresso', 'tubruk', 'moka_pot', 'cold_brew'], required: true },
  doseGrams: { type: Number, required: true, min: 5, max: 100 },
  waterGrams: { type: Number, required: true, min: 20, max: 2000 },
  waterTempC: { type: Number, min: 0, max: 100 },
  grindSize: { type: String, enum: ['extra_fine', 'fine', 'medium_fine', 'medium', 'medium_coarse', 'coarse'] },
  grinderSetting: String,
  brewTimeSeconds: { type: Number, min: 0, max: 86400 },
  tdsPercent: { type: Number, min: 0, max: 20 },
  rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
  cupping: { type: mongoose.Schema.Types.Mixed, default: {} },
  tasteTags: { type: [String], validate: value => value.length <= 8 },
  notes: { type: String, maxlength: 1000 },
  isFavorite: { type: Boolean, default: false },
  brewedAt: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true, transform: (_, ret) => {
  ret.id = ret._id.toString();
  ret.bean = ret.bean && ret.bean._id ? { ...ret.bean, id: ret.bean._id.toString(), _id: undefined, __v: undefined } : ret.bean;
  ret.ratio = Math.round((ret.waterGrams / ret.doseGrams) * 10) / 10;
  const values = scores.map(key => Number(ret.cupping?.[key])).filter(value => Number.isInteger(value) && value >= 1 && value <= 10);
  ret.cuppingAverage = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
  delete ret._id; delete ret.__v; return ret;
} } });

export default mongoose.model('Brew', brewSchema);
