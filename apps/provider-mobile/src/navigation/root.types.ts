export type RootStackParamList = {
  Gateway: undefined;
  ProviderLogin: undefined;
  ProviderOtp: { mobileNumber: string };
  ProviderDashboard: undefined;
  ProviderJobDetail: { bookingId: string };
  JobStatusUpdate: { bookingId: string };
};
