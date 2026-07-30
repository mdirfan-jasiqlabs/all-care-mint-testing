export type RootStackParamList = {
  Gateway: undefined;
  PhoneInput: undefined;
  OtpVerify: { mobileNumber: string };
  Home: undefined;
  Profile: undefined;
  CatalogBrowse: { token?: string } | undefined;
  ServiceDetail: { serviceId: string };
  AddressSelection: { serviceId: string };
  SlotSelection: { serviceId: string; addressId: string };
  BookingSummary: { serviceId: string; addressId: string; slotId: string; date: string };
  BookingConfirmation: { bookingId: string; status: string };
  MyBookings: { toastMessage?: string } | undefined;
  BookingDetail: { bookingId: string };
};
