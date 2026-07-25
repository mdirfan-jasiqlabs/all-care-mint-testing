export type RootStackParamList = {
  ProviderLogin: undefined;
  ProviderOtp: { mobileNumber: string };
  ProviderDashboard: undefined;
  ProviderJobDetail: { bookingId: string };
  JobStatusUpdate: { bookingId: string };
};
