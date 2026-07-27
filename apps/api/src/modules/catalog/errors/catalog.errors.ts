import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

export const CATALOG_ERROR_CODES = {
  CATEGORY_NOT_FOUND: 'ERR_CATALOG_CATEGORY_NOT_FOUND',
  SERVICE_NOT_FOUND: 'ERR_CATALOG_SERVICE_NOT_FOUND',
  CATEGORY_DUPLICATE: 'ERR_CATALOG_CATEGORY_DUPLICATE',
  INVALID_PRICE: 'ERR_CATALOG_INVALID_PRICE',
};

export class CategoryNotFoundException extends NotFoundException {
  constructor(categoryId?: string) {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: categoryId
        ? `Category with ID '${categoryId}' was not found.`
        : 'Category not found.',
      code: CATALOG_ERROR_CODES.CATEGORY_NOT_FOUND,
    });
  }
}

export class ServiceNotFoundException extends NotFoundException {
  constructor(serviceId?: string) {
    super({
      statusCode: 404,
      error: 'Not Found',
      message: serviceId
        ? `Service with ID '${serviceId}' was not found.`
        : 'Service not found.',
      code: CATALOG_ERROR_CODES.SERVICE_NOT_FOUND,
    });
  }
}

export class CategoryDuplicateException extends ConflictException {
  constructor(name: string) {
    super({
      statusCode: 409,
      error: 'Conflict',
      message: `Service category with name '${name}' already exists.`,
      code: CATALOG_ERROR_CODES.CATEGORY_DUPLICATE,
    });
  }
}

export class InvalidPriceException extends BadRequestException {
  constructor(message: string = 'Fixed price must be greater than 0.') {
    super({
      statusCode: 400,
      error: 'Bad Request',
      message,
      code: CATALOG_ERROR_CODES.INVALID_PRICE,
    });
  }
}
