import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagService {
  isCatalogEnabled(): boolean {
    const val = process.env.FF_CATALOG_ENABLED ?? process.env.ff_catalog_enabled;
    if (val === undefined || val === null) {
      return true; // defaults to true
    }
    return val !== 'false' && val !== '0';
  }
}
