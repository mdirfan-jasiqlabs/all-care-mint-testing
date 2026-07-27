// ─── MOD-002 Prisma Address Repository Adapter ───

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAddressRepository } from '../ports/address.repository.port';
import { Address } from '../types/booking.types';

@Injectable()
export class PrismaAddressRepository implements IAddressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAddressById(id: string): Promise<Address | null> {
    const addr = await this.prisma.customerAddress.findUnique({
      where: { id },
    });
    return addr ? this.mapToEntity(addr) : null;
  }

  async findAddressesByCustomer(customerId: string): Promise<Address[]> {
    const addresses = await this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return addresses.map(this.mapToEntity);
  }

  async countAddressesByCustomer(customerId: string): Promise<number> {
    return this.prisma.customerAddress.count({
      where: { customerId },
    });
  }

  async saveAddress(address: {
    customerId: string;
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    pincode: string;
  }): Promise<Address> {
    const created = await this.prisma.customerAddress.create({
      data: {
        customerId: address.customerId,
        label: address.label,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? null,
        city: address.city,
        pincode: address.pincode,
      },
    });
    return this.mapToEntity(created);
  }

  async updateAddress(id: string, address: Partial<Address>): Promise<Address> {
    const updated = await this.prisma.customerAddress.update({
      where: { id },
      data: {
        ...(address.label !== undefined && { label: address.label }),
        ...(address.addressLine1 !== undefined && {
          addressLine1: address.addressLine1,
        }),
        ...(address.addressLine2 !== undefined && {
          addressLine2: address.addressLine2,
        }),
        ...(address.city !== undefined && { city: address.city }),
        ...(address.pincode !== undefined && { pincode: address.pincode }),
        updatedAt: new Date(),
      },
    });
    return this.mapToEntity(updated);
  }

  async deleteAddress(id: string): Promise<void> {
    await this.prisma.customerAddress.delete({
      where: { id },
    });
  }

  private mapToEntity(record: any): Address {
    return {
      id: record.id,
      customerId: record.customerId,
      label: record.label,
      addressLine1: record.addressLine1,
      addressLine2: record.addressLine2,
      city: record.city,
      pincode: record.pincode,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
