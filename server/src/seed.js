import 'dotenv/config';
import mongoose from 'mongoose';
import { configureDnsResolver } from './config/dns.js';
import Bean from './models/Bean.js';
import Brew from './models/Brew.js';

configureDnsResolver();

const beans = [
  ['Gayo', 'Gayo, Aceh', 'washed', 'medium', ['Cokelat', 'Rempah']],
  ['Toraja Sapan', 'Toraja, Sulawesi Selatan', 'natural', 'light', ['Buah beri', 'Floral']],
  ['Kintamani', 'Kintamani, Bali', 'washed', 'light', ['Jeruk', 'Manis madu']],
  ['Flores Bajawa', 'Bajawa, Nusa Tenggara Timur', 'honey', 'medium', ['Karamel', 'Kacang']],
  ['Java Preanger', 'Pangalengan, Jawa Barat', 'anaerobic', 'medium', ['Buah beri', 'Cokelat']],
  ['Wamena', 'Wamena, Papua', 'washed', 'light', ['Floral', 'Jeruk']]
];
const methods = ['v60', 'french_press', 'aeropress', 'espresso', 'tubruk', 'moka_pot', 'cold_brew'];
const ratios = { v60: 16, french_press: 15, aeropress: 15, espresso: 2, tubruk: 12, moka_pot: 10, cold_brew: 8 };

try {
  await mongoose.connect(process.env.MONGODB_URI);
  await Brew.deleteMany({});
  await Bean.deleteMany({});
  const savedBeans = await Bean.insertMany(beans.map(([name, origin, process, roastLevel, flavorNotes]) => ({ name, origin, process, roastLevel, flavorNotes })));
  const brews = Array.from({ length: 15 }, (_, index) => {
    const bean = savedBeans[index % savedBeans.length];
    const method = methods[index % methods.length];
    const doseGrams = method === 'espresso' ? 18 : 15 + index % 4;
    return {
      bean: bean._id, method, doseGrams, waterGrams: doseGrams * ratios[method],
      waterTempC: 88 + index % 9, grindSize: ['medium_fine', 'coarse', 'fine'][index % 3],
      brewTimeSeconds: 120 + index * 8, rating: 3 + index % 3, isFavorite: index % 4 === 0,
      tasteTags: bean.flavorNotes.slice(0, 2), notes: `Seduhan ${method} dengan karakter ${bean.flavorNotes[0]}.`,
      cupping: { aroma: 7 + index % 3, flavor: 7 + (index + 1) % 3, acidity: 6 + index % 4, body: 7, sweetness: 8, aftertaste: 7, balance: 8 },
      brewedAt: new Date(Date.now() - (index * 3 + index % 4) * 86400000)
    };
  });
  await Brew.insertMany(brews);
  process.stdout.write('Seed berhasil: 6 biji dan 15 seduhan.\n');
} catch (error) {
  console.error(`Seed gagal: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
