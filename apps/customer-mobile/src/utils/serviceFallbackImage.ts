import { ImageSourcePropType } from 'react-native';

export interface ServiceLike {
  id?: string;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryName?: string | null;
  category?: {
    name?: string | null;
  } | null;
}

const FALLBACK_PAINTING = require('../../assets/hero_painting.png');
const FALLBACK_CLEANING = require('../../assets/hero_cleaning.png');
const FALLBACK_PLUMBING = require('../../assets/hero_plumbing.png');
const FALLBACK_AC_REPAIR = require('../../assets/hero_ac_repair.png');
const FALLBACK_CAREGIVER = require('../../assets/hero_caregiver.png');
const FALLBACK_GENERIC = require('../../assets/logo.png');

/**
 * Resolves appropriate hero image for a service based on available image URL or service/category keywords.
 */
export function getServiceFallbackImage(service?: ServiceLike | null, categoryName?: string | null): ImageSourcePropType {
  if (!service && !categoryName) {
    return FALLBACK_GENERIC;
  }

  // 1. Future-compatibility check: If backend provides a valid real image URL
  if (service?.imageUrl && typeof service.imageUrl === 'string' && service.imageUrl.startsWith('http')) {
    return { uri: service.imageUrl };
  }

  const nameLower = (service?.name || '').toLowerCase();
  const descLower = (service?.description || '').toLowerCase();
  const catLower = (categoryName || service?.categoryName || service?.category?.name || '').toLowerCase();
  const combinedText = `${nameLower} ${descLower} ${catLower}`;

  // 2. Keyword matching for known catalog categories & services
  if (combinedText.includes('paint') || combinedText.includes('wall') || combinedText.includes('whitewash')) {
    return FALLBACK_PAINTING;
  }
  if (combinedText.includes('clean') || combinedText.includes('sofa') || combinedText.includes('kitchen') || combinedText.includes('maid') || combinedText.includes('broom')) {
    return FALLBACK_CLEANING;
  }
  if (combinedText.includes('plumb') || combinedText.includes('leak') || combinedText.includes('pipe') || combinedText.includes('tap') || combinedText.includes('drain')) {
    return FALLBACK_PLUMBING;
  }
  if (combinedText.includes('ac') || combinedText.includes('air condition') || combinedText.includes('cooling') || combinedText.includes('compressor')) {
    return FALLBACK_AC_REPAIR;
  }
  if (combinedText.includes('care') || combinedText.includes('elder') || combinedText.includes('nurse') || combinedText.includes('baby')) {
    return FALLBACK_CAREGIVER;
  }

  // 3. Default generic fallback
  return FALLBACK_GENERIC;
}

/**
 * Resolves a suitable icon name for @expo/vector-icons Ionicons based on service/category.
 */
export function getServiceCategoryIcon(service?: ServiceLike | null, categoryName?: string | null): string {
  const nameLower = (service?.name || '').toLowerCase();
  const catLower = (categoryName || service?.categoryName || service?.category?.name || '').toLowerCase();
  const combinedText = `${nameLower} ${catLower}`;

  if (combinedText.includes('paint')) return 'color-palette';
  if (combinedText.includes('clean')) return 'sparkles';
  if (combinedText.includes('plumb') || combinedText.includes('leak')) return 'water';
  if (combinedText.includes('ac') || combinedText.includes('air')) return 'snow';
  if (combinedText.includes('care')) return 'heart-circle';
  if (combinedText.includes('electric')) return 'flash';
  if (combinedText.includes('carpenter')) return 'hammer';

  return 'construct';
}
