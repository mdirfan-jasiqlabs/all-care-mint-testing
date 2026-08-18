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

const ASSET_REGULAR_CLEANING = require('../../assets/hero_regular_cleaning.png');
const ASSET_DEEP_CLEANING = require('../../assets/hero_deep_cleaning.png');
const ASSET_SOFA_CLEANING = require('../../assets/hero_sofa_cleaning.png');
const ASSET_KITCHEN_CLEANING = require('../../assets/hero_kitchen_cleaning.png');
const ASSET_AC_REPAIR = require('../../assets/hero_ac_repair.png');
const ASSET_PLUMBING = require('../../assets/hero_plumbing.png');
const ASSET_PAINTING = require('../../assets/hero_painting.png');
const ASSET_CAREGIVER = require('../../assets/hero_caregiver.png');
const ASSET_GENERIC_CLEANING = require('../../assets/hero_cleaning.png');
const ASSET_GENERIC_SERVICE = require('../../assets/hero_generic_service.png');

/**
 * Resolves appropriate hero image for a service based on available image URL or service/category keywords.
 */
export function getServiceFallbackImage(service?: ServiceLike | null, categoryName?: string | null): ImageSourcePropType {
  if (!service && !categoryName) {
    return ASSET_GENERIC_SERVICE;
  }

  // 1. Future-compatibility check: If backend provides a valid real image URL
  if (service?.imageUrl && typeof service.imageUrl === 'string' && service.imageUrl.startsWith('http')) {
    return { uri: service.imageUrl };
  }

  const nameLower = (service?.name || '').toLowerCase();
  const descLower = (service?.description || '').toLowerCase();
  const catLower = (categoryName || service?.categoryName || service?.category?.name || '').toLowerCase();
  const combinedText = `${nameLower} ${descLower} ${catLower}`;

  // 2. Specific Service Name matching for actual catalog services
  if (nameLower.includes('sofa cleaning')) {
    return ASSET_SOFA_CLEANING;
  }
  if (nameLower.includes('kitchen cleaning')) {
    return ASSET_KITCHEN_CLEANING;
  }
  if (nameLower.includes('deep cleaning')) {
    return ASSET_DEEP_CLEANING;
  }
  if (nameLower.includes('regular cleaning') || nameLower.includes('standard cleaning')) {
    return ASSET_REGULAR_CLEANING;
  }

  // 3. Category & general keyword matching
  if (combinedText.includes('paint') || combinedText.includes('wall') || combinedText.includes('whitewash')) {
    return ASSET_PAINTING;
  }
  if (combinedText.includes('ac') || combinedText.includes('air condition') || combinedText.includes('cooling') || combinedText.includes('compressor')) {
    return ASSET_AC_REPAIR;
  }
  if (combinedText.includes('plumb') || combinedText.includes('leak') || combinedText.includes('pipe') || combinedText.includes('tap') || combinedText.includes('drain')) {
    return ASSET_PLUMBING;
  }
  if (combinedText.includes('care') || combinedText.includes('elder') || combinedText.includes('nurse') || combinedText.includes('baby')) {
    return ASSET_CAREGIVER;
  }
  if (combinedText.includes('clean') || combinedText.includes('maid') || combinedText.includes('broom')) {
    return ASSET_GENERIC_CLEANING;
  }

  // 4. Default generic All-Care-Mint service fallback
  return ASSET_GENERIC_SERVICE;
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
