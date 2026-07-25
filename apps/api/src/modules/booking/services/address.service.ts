// ─── MOD-002 Address Service ───
// Source: DLD Section 4.1 — handles customer address CRUD with 5-address limit and pincode validation

import { Inject, Injectable } from '@nestjs/common';
import { IAddressRepository } from '../ports/address.repository.port';
import { Address } from '../types/booking.types';
import { CreateAddressDto, UpdateAddressDto } from '../dto/booking.dto';
import {
  AddressNotFoundException,
  AddressLimitExceededException,
} from '../errors/booking.exceptions';

@Injectable()
export class AddressService {
  private static readonly MAX_ADDRESSES = 5;

  constructor(
    @Inject('IAddressRepository')
    private readonly addressRepo: IAddressRepository,
  ) {}

  async listAddresses(customerId: string): Promise<Address[]> {
    return this.addressRepo.findAddressesByCustomer(customerId);
  }

  async createAddress(
    customerId: string,
    dto: CreateAddressDto,
  ): Promise<Address> {
    const count = await this.addressRepo.countAddressesByCustomer(customerId);
    if (count >= AddressService.MAX_ADDRESSES) {
      throw new AddressLimitExceededException();
    }

    return this.addressRepo.saveAddress({
      customerId,
      label: dto.label,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      city: dto.city,
      pincode: dto.pincode,
    });
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressRepo.findAddressById(addressId);
    if (!address || address.customerId !== customerId) {
      throw new AddressNotFoundException();
    }

    return this.addressRepo.updateAddress(addressId, {
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
      ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
      ...(dto.city !== undefined && { city: dto.city }),
      ...(dto.pincode !== undefined && { pincode: dto.pincode }),
    });
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    const address = await this.addressRepo.findAddressById(addressId);
    if (!address || address.customerId !== customerId) {
      throw new AddressNotFoundException();
    }

    await this.addressRepo.deleteAddress(addressId);
  }

  async getAddressById(
    customerId: string,
    addressId: string,
  ): Promise<Address> {
    const address = await this.addressRepo.findAddressById(addressId);
    if (!address || address.customerId !== customerId) {
      throw new AddressNotFoundException();
    }
    return address;
  }
}
