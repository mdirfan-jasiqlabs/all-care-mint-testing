export interface BookingStatusChangedEvent {
  bookingId: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'ON_THE_WAY' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  customerId: string;
  providerId?: string;
  serviceName?: string;
  statusHistoryId?: string;
  deliveredTokens?: string[];
  timestamp: number;
}
