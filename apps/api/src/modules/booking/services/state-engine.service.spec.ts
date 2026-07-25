import { Test, TestingModule } from '@nestjs/testing';
import { StateEngineService } from './state-engine.service';
import { BookingStatusEnum, ActorRoleEnum } from '../types/booking.types';
import { InvalidTransitionException } from '../errors/booking.exceptions';

describe('StateEngineService', () => {
  let service: StateEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StateEngineService],
    }).compile();

    service = module.get<StateEngineService>(StateEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TC-UNIT-002-001: Transition PENDING -> ON_THE_WAY fails
  it('TC-UNIT-002-001: should fail transition from PENDING to ON_THE_WAY', () => {
    expect(() => {
      service.validateTransition(
        BookingStatusEnum.PENDING,
        BookingStatusEnum.ON_THE_WAY,
        ActorRoleEnum.PROVIDER,
      );
    }).toThrow(InvalidTransitionException);
  });

  // TC-UNIT-002-013: Transition STARTED -> COMPLETED succeeds (Provider)
  it('TC-UNIT-002-013: should succeed transition from STARTED to COMPLETED by Provider', () => {
    expect(() => {
      service.validateTransition(
        BookingStatusEnum.STARTED,
        BookingStatusEnum.COMPLETED,
        ActorRoleEnum.PROVIDER,
      );
    }).not.toThrow();
  });

  // TC-UNIT-002-014: Transition ASSIGNED -> REJECTED succeeds (Provider)
  it('TC-UNIT-002-014: should succeed transition from ASSIGNED to REJECTED by Provider', () => {
    expect(() => {
      service.validateTransition(
        BookingStatusEnum.ASSIGNED,
        BookingStatusEnum.REJECTED,
        ActorRoleEnum.PROVIDER,
      );
    }).not.toThrow();
  });

  // Additional checks
  it('should allow customer to cancel PENDING booking', () => {
    expect(() => {
      service.validateTransition(
        BookingStatusEnum.PENDING,
        BookingStatusEnum.CANCELLED,
        ActorRoleEnum.CUSTOMER,
      );
    }).not.toThrow();
  });

  it('should deny customer to cancel ACCEPTED booking', () => {
    expect(() => {
      service.validateTransition(
        BookingStatusEnum.ACCEPTED,
        BookingStatusEnum.CANCELLED,
        ActorRoleEnum.CUSTOMER,
      );
    }).toThrow(InvalidTransitionException);
  });
});
