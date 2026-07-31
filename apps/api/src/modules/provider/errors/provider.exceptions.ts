import { ConflictException, NotFoundException } from '@nestjs/common';

export class ProviderMobileExistsException extends ConflictException {
  constructor(mobile: string) {
    super({
      success: false,
      error: {
        code: 'ERR_PROVIDER_MOBILE_EXISTS',
        message: `Provider with mobile number ${mobile} already registered.`,
      },
    });
  }
}

export class ProviderNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      success: false,
      error: {
        code: 'ERR_PROVIDER_NOT_FOUND',
        message: `Provider with ID ${id} not found.`,
      },
    });
  }
}

export class CategoryNotFoundException extends NotFoundException {
  constructor(id: string) {
    super({
      success: false,
      error: {
        code: 'ERR_CATEGORY_NOT_FOUND',
        message: `Service category with ID ${id} not found.`,
      },
    });
  }
}
