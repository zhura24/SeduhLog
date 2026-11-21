// Kurasi gambar biji kopi berkualitas tinggi untuk setiap varian dan profil sangrai
export const BEAN_IMAGE_PRESETS = [
  {
    id: 'sumatra-gayo',
    name: 'Gayo & Sumatra Dark',
    url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
    description: 'Biji sangrai medium-dark khas Sumatra dengan kilau alami'
  },
  {
    id: 'toraja-sulawesi',
    name: 'Toraja & Kalosi Highlands',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    description: 'Biji kopi pegunungan Sulawesi dengan aroma rempah'
  },
  {
    id: 'bali-kintamani',
    name: 'Kintamani & Natural Process',
    url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80',
    description: 'Biji light roast keemasan dengan keasaman jeruk cerah'
  },
  {
    id: 'flores-bajawa',
    name: 'Flores Bajawa & Java Washed',
    url: 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?auto=format&fit=crop&w=600&q=80',
    description: 'Profil sangrai medium merata bernuansa cokelat kacang'
  },
  {
    id: 'preanger-honey',
    name: 'Honey & Sweet Caramel',
    url: 'https://images.unsplash.com/photo-1518832553480-cd0e625ed3e6?auto=format&fit=crop&w=600&q=80',
    description: 'Biji proses madu dengan rona karamel manis'
  },
  {
    id: 'fruity-anaerobic',
    name: 'Fruity & Anaerobic Ferment',
    url: 'https://images.unsplash.com/photo-1610632380989-680fe40816c6?auto=format&fit=crop&w=600&q=80',
    description: 'Biji fermentasi eksotis bernuansa buah berry & wine'
  },
  {
    id: 'dark-bold',
    name: 'Dark Roast & Robusta Bold',
    url: 'https://images.unsplash.com/photo-1580933073521-dc49ac0d4e6a?auto=format&fit=crop&w=600&q=80',
    description: 'Sangrai pekat berkarakter kuat untuk espresso & tubruk'
  },
  {
    id: 'ethiopia-african',
    name: 'Ethiopia & Floral Heirloom',
    url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80',
    description: 'Biji heirloom Afrika dengan karakter melati & bergamot'
  },
  {
    id: 'papua-wamena',
    name: 'Wamena & Highland Specialty',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
    description: 'Biji organik ketinggian tinggi Lembah Baliem'
  },
  {
    id: 'colombia-huila',
    name: 'Colombia & Central America',
    url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80',
    description: 'Karakter seimbang dengan rasa apel karamel'
  }
];

const MAX_SOURCE_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE_SIZE = 600 * 1024;
const MAX_IMAGE_DIMENSION = 1280;

const readAsDataUrl = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Foto tidak dapat dibaca.'));
  reader.readAsDataURL(blob);
});

const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Format foto tidak dapat dibuka.'));
  image.src = source;
});

const canvasToBlob = (canvas, type, quality) => new Promise(resolve => {
  canvas.toBlob(resolve, type, quality);
});

export async function prepareBeanImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Pilih foto berformat JPG, PNG, atau WebP.');
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error('Ukuran foto maksimal 8 MB.');
  }

  const image = await loadImage(await readAsDataUrl(file));
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('Foto tidak memiliki ukuran yang valid.');
  }

  let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const formats = ['image/webp', 'image/jpeg'];
  const qualities = [0.84, 0.74, 0.64, 0.54];

  for (let resize = 0; resize < 5; resize += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Foto tidak dapat diproses di perangkat ini.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const format of formats) {
      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, format, quality);
        if (blob?.type.startsWith('image/') && blob.size <= MAX_IMAGE_SIZE) {
          return readAsDataUrl(blob);
        }
      }
    }

    scale *= 0.8;
  }

  throw new Error('Foto terlalu besar untuk disimpan. Coba pilih foto lain.');
}

export function getBeanImage(bean) {
  return typeof bean?.imageUrl === 'string' ? bean.imageUrl.trim() : '';
}
