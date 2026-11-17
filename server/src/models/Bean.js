import mongoose from 'mongoose';

const beanSchema = new mongoose.Schema({
  name: { type: String, required: true, minlength: 2, maxlength: 80, trim: true },
  origin: { type: String, required: true, trim: true },
  roaster: { type: String, trim: true },
  process: { type: String, enum: ['washed', 'natural', 'honey', 'anaerobic', 'lainnya'], default: 'washed' },
  roastLevel: { type: String, enum: ['light', 'medium', 'dark'], default: 'medium' },
  variety: String,
  altitudeMasl: { type: Number, min: 0, max: 3000 },
  roastDate: Date,
  flavorNotes: { type: [String], validate: value => value.length <= 8 },
  imageUrl: { type: String, validate: { validator: value => !value || /^https?:\/\/.+/i.test(value), message: 'URL gambar harus menggunakan http atau https' } },
  notes: { type: String, maxlength: 500 }
}, { timestamps: true, toJSON: { virtuals: true, transform: (_, ret) => { ret.id = ret._id.toString(); delete ret._id; delete ret.__v; return ret; } } });

export default mongoose.model('Bean', beanSchema);
