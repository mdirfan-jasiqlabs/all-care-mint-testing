// ─── MOD-002 Address Repository Port ───
// Source: DLD Section 4.3 — Hexagonal Ports & Adapters

import { Address } from '../types/booking.types';

export interface IAddressRepository {
  findAddressById(id: string): Promise<Address | null>;
  findAddressesByCustomer(customerId: string): Promise<Address[]>;
  countAddressesByCustomer(customerId: string): Promise<number>;
  saveAddress(address: {
    customerId: string;
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    pincode: string;
  }): Promise<Address>;
  updateAddress(id: string, address: Partial<Address>): Promise<Address>;
  deleteAddress(id: string): Promise<void>;
}
