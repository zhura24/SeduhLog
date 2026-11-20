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

export const BEAN_IMAGE_MAP = {
  gayo: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80',
  toraja: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  kintamani: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80',
  bajawa: 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?auto=format&fit=crop&w=600&q=80',
  preanger: 'https://images.unsplash.com/photo-1518832553480-cd0e625ed3e6?auto=format&fit=crop&w=600&q=80',
  wamena: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  mandailing: 'https://images.unsplash.com/photo-1580933073521-dc49ac0d4e6a?auto=format&fit=crop&w=600&q=80',
  lintong: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80',
  ijen: 'https://images.unsplash.com/photo-1610632380989-680fe40816c6?auto=format&fit=crop&w=600&q=80',
  temanggung: 'https://images.unsplash.com/photo-1504630083234-14187a9df0f5?auto=format&fit=crop&w=600&q=80',
  lampung: 'https://images.unsplash.com/photo-1524350876685-274059332603?auto=format&fit=crop&w=600&q=80',
  kerinci: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=600&q=80',
  kalosi: 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=600&q=80',
  frinsa: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
  yirga: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=600&q=80',
  huila: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=600&q=80',
  sidikalang: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80'
};

export function getBeanImage(bean) {
  if (bean?.imageUrl && typeof bean.imageUrl === 'string' && bean.imageUrl.trim() !== '') {
    return bean.imageUrl;
  }
  const name = (bean?.name || '').toLowerCase();
  for (const [key, url] of Object.entries(BEAN_IMAGE_MAP)) {
    if (name.includes(key)) return url;
  }
  // Berdasarkan proses atau level sangrai jika nama tidak cocok
  if (bean?.process === 'honey') return BEAN_IMAGE_MAP.preanger;
  if (bean?.process === 'anaerobic') return BEAN_IMAGE_MAP.frinsa;
  if (bean?.process === 'natural') return BEAN_IMAGE_MAP.kintamani;
  if (bean?.roastLevel === 'dark') return BEAN_IMAGE_MAP.mandailing;
  if (bean?.roastLevel === 'light') return BEAN_IMAGE_MAP.wamena;

  return BEAN_IMAGE_MAP.toraja;
}
