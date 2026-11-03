/**
 * Master Cuisine Categories & Automated Dish Classification
 * Categorizes all restaurant dishes into 4 primary culinary streams:
 * 1. South Indian (દક્ષિણ ભારતીય)
 * 2. Chinese (ચાઈનીઝ વાનગીઓ)
 * 3. Gujarati & Pav Bhaji (ગુજરાતી & પાંઉભાજી)
 * 4. Beverages & Snacks (પીણાં અને નાસ્તો)
 */

export const MASTER_CUISINES = [
  {
    id: 'south_indian',
    name: 'South Indian',
    gujarati: 'દક્ષિણ ભારતીય',
    image: '/hero_mysore_dosa.jpg',
    tagline: 'Crispy Dosas & Live Tawa',
    desc: 'Plain Paper, Mysore Masala, Cheese Burst, Gotala, Jini Roll & Uttapams',
    accent: 'amber',
    bgGradient: 'from-amber-500/15 via-orange-500/10 to-transparent',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    popularItems: ['Mysore Masala Dosa', 'Cheese Burst Dosa', 'Bahubali Dosa', 'Amul Uttapam']
  },
  {
    id: 'chinese',
    name: 'Chinese',
    gujarati: 'ચાઈનીઝ વાનગીઓ',
    image: '/hero_chinese_wok.jpg',
    tagline: 'Sizzling Wok & Noodles',
    desc: 'Hakka Noodles, Schezwan Fried Rice, Manchurian, Chinese Bhel & Warm Soups',
    accent: 'rose',
    bgGradient: 'from-rose-500/15 via-red-500/10 to-transparent',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    popularItems: ['Schezwan Fried Rice', 'Hakka Noodles', 'Manchurian Dry', 'Chinese Bhel']
  },
  {
    id: 'gujarati',
    name: 'Gujarati & Pav Bhaji',
    gujarati: 'ગુજરાતી & પાંઉભાજી',
    image: '/hero_pav_bhaji.jpg',
    tagline: 'Amul Butter & Desi Tadka',
    desc: 'Special Amul Pav Bhaji, Cheese Bhaji, Tawa Pulav & Roasted Masala Papad',
    accent: 'orange',
    bgGradient: 'from-orange-500/15 via-amber-500/10 to-transparent',
    badgeColor: 'bg-orange-100 text-orange-900 border-orange-300',
    popularItems: ['Amul Butter Pav Bhaji', 'Cheese Pav Bhaji', 'Tawa Pulav', 'Masala Papad']
  },
  {
    id: 'beverages',
    name: 'Beverages & Desserts',
    gujarati: 'પીણાં અને નાસ્તો',
    image: '/hero_masala_chaas.jpg',
    tagline: 'Chilled Drinks & Coolers',
    desc: 'Fresh Masala Chaas, Sweet Lassi, Cold Drinks, Mineral Water & Ice Creams',
    accent: 'cyan',
    bgGradient: 'from-cyan-500/15 via-blue-500/10 to-transparent',
    badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    popularItems: ['Masala Chaas', 'Sweet Lassi', 'Mineral Water (Chilled)', 'Cold Drinks']
  }
];

export const CUISINE_CONFIG = {
  south_indian: { label: 'Dosa Tawa Station', gujaratiLabel: 'ઢોસા તવો', icon: '🥞' },
  chinese: { label: 'Chinese Wok Station', gujaratiLabel: 'ચાઈનીઝ વૉક', icon: '🍜' },
  gujarati: { label: 'Pav Bhaji & Desi Tadka', gujaratiLabel: 'પાંઉભાજી & પાવ', icon: '🍲' },
  beverages: { label: 'Beverages & Counter', gujaratiLabel: 'પીણાં & કાઉન્ટર', icon: '💧' },
};

/**
 * Classifies any dish item into one of the 4 master cuisines.
 * @param {object} item - Menu item
 * @returns {'south_indian' | 'chinese' | 'gujarati' | 'beverages'}
 */
export function getDishCuisine(item) {
  if (!item) return 'south_indian';

  // 0. Explicit cuisine assignment by Admin or Database
  const explicit = item.cuisine || item.master_cuisine || item.masterCuisine;
  if (explicit) {
    const raw = String(explicit).toLowerCase().trim().replace(/[\s-]/g, '_');
    if (['south_indian', 'chinese', 'gujarati', 'beverages'].includes(raw)) {
      return raw;
    }
    if (raw.includes('south') || raw.includes('dosa') || raw.includes('idli') || raw.includes('uttapam')) return 'south_indian';
    if (raw.includes('chinese') || raw.includes('noodle') || raw.includes('wok')) return 'chinese';
    if (raw.includes('gujarat') || raw.includes('pav') || raw.includes('bhaji') || raw.includes('pulao')) return 'gujarati';
    if (raw.includes('beverage') || raw.includes('drink') || raw.includes('water') || raw.includes('dessert')) return 'beverages';
  }

  const cat = String(item.category || '').toLowerCase();
  const name = String(item.english_name || item.name || '').toLowerCase();
  const desc = String(item.description || '').toLowerCase();

  // 1. Beverages & Refreshments & Desserts
  if (
    cat.includes('beverage') || cat.includes('drink') || cat.includes('water') || 
    cat.includes('dessert') || cat.includes('ice cream') || cat.includes('dairy') ||
    cat.includes('shake') || cat.includes('juice') || cat.includes('cooler') ||
    name.includes('chaas') || name.includes('lassi') || name.includes('water') || 
    name.includes('drink') || name.includes('coke') || name.includes('sprite') || 
    name.includes('thums') || name.includes('fanta') || name.includes('ice cream') ||
    name.includes('mineral water') || name.includes('cold drink') || name.includes('soda') ||
    desc.includes('chilled drink') || desc.includes('refreshing cooler')
  ) {
    return 'beverages';
  }

  // 2. Chinese Specialties & Wok Dishes
  if (
    cat.includes('chinese') || cat.includes('noodle') || cat.includes('manchurian') || 
    cat.includes('soup') || cat.includes('maggi') || cat.includes('starter') ||
    cat.includes('wok') || cat.includes('bhel') ||
    name.includes('chinese') || name.includes('noodle') || name.includes('manchurian') || 
    name.includes('soup') || name.includes('schezwan') || name.includes('bhel') || 
    name.includes('maggi') || name.includes('chilli') || name.includes('chilly') || 
    name.includes('fried rice') || name.includes('hakka') || name.includes('tripple rice') || 
    name.includes('singapuri') || name.includes('spring roll') || name.includes('crispy corn') ||
    name.includes('paneer chilli') || name.includes('momos')
  ) {
    return 'chinese';
  }

  // 3. Gujarati, Street Food, Pav Bhaji & Pulao
  if (
    cat.includes('pav') || cat.includes('bhaji') || cat.includes('pulav') || cat.includes('pulao') ||
    cat.includes('papad') || cat.includes('gujarati') || cat.includes('kathiyawadi') ||
    cat.includes('chaat') || cat.includes('snack') || cat.includes('sandwich') ||
    name.includes('pav') || name.includes('bhaji') || name.includes('pulav') || name.includes('pulao') ||
    name.includes('papad') || name.includes('maska') || name.includes('khakhra') ||
    name.includes('french fry') || name.includes('french fries') || name.includes('dhokla') ||
    name.includes('handvo') || name.includes('thepla') || name.includes('sev') ||
    name.includes('kachori') || name.includes('samosa') || name.includes('sandwich')
  ) {
    return 'gujarati';
  }

  // 4. Default: South Indian Tawa Dosa Specialties
  return 'south_indian';
}
