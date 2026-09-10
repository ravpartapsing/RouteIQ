// =============================================================================
// FILE: mock_data.dart
// PURPOSE: All static demo data for the RouteIQ Driver app.
//          Replaces API calls in demo build.  Data is compile-time const
//          where possible; no network, no database, no dynamic allocation.
//
// NASA RULE 1 — no loops with unbounded conditions.
// NASA RULE 3 — restrict data scope; accessed only through MockDataSource.
// NASA RULE 7 — all getters return non-null values or documented nullables.
// =============================================================================

import '../models/driver_model.dart';
import '../models/load_model.dart';
import '../models/hos_model.dart';
import '../models/message_model.dart';
import '../models/settlement_model.dart';

/// Single access point for all static demo data.
/// All members are static — no instantiation needed.
abstract final class MockDataSource {

  // ---------------------------------------------------------------------------
  // Driver profile
  // ---------------------------------------------------------------------------

  /// The logged-in demo driver.
  static final DriverModel driver = DriverModel(
    id:               'DRV-001',
    firstName:        'James',
    lastName:         'Davidson',
    cdlNumber:        'CDL-IL-842901',
    cdlClass:         'CDL-A',
    cdlExpiry:        DateTime(2026, 9, 15),
    medicalExpiry:    DateTime(2025, 6, 30),
    driverType:       'Owner-Operator',
    employeeNumber:   'EMP-001',
    phone:            '+1 (555) 123-4567',
    email:            'james.davidson@email.com',
    onTimePercent:    94.0,
    totalLoads:       247,
    totalMilesDriven: 124000,
    safetyScore:      98.0,
  );

  // ---------------------------------------------------------------------------
  // Loads
  // ---------------------------------------------------------------------------

  /// Active load currently in transit.
  static final LoadModel activeLoad = LoadModel(
    id:            'LD-2026-00143',
    orderNumber:   'ORD-2026-00143',
    status:        LoadStatus.inTransit,
    origin:        'Chicago, IL',
    destination:   'Dallas, TX',
    equipmentType: 'Dry Van 53ft',
    loadType:      'FTL',
    weightLbs:     42000,
    commodity:     'General Freight',
    customerName:  'Apex Logistics LLC',
    bolNumber:     'BOL-2026-00143',
    baseRateUsd:   2100.00,
    fuelSurchargeUsd: 210.00,
    specialInstructions: 'Liftgate required at delivery. Call consignee 1 hour before arrival.',
    stops: [
      StopModel(
        id:            'ST-001',
        type:          StopType.pickup,
        facilityName:  'Apex Logistics — Chicago',
        address:       '1200 W Lake St',
        city:          'Chicago',
        state:         'IL',
        scheduledTime: DateTime(2026, 4, 4, 8, 0),
        actualTime:    DateTime(2026, 4, 4, 7, 52),
        status:        StopStatus.completed,
        contactName:   'Bob Martinez',
        contactPhone:  '+1 (312) 555-0100',
        dockNumber:    'Dock 4',
      ),
      StopModel(
        id:            'ST-002',
        type:          StopType.waypoint,
        facilityName:  'Cross-Dock — St. Louis',
        address:       '4500 Riverview Dr',
        city:          'St. Louis',
        state:         'MO',
        scheduledTime: DateTime(2026, 4, 4, 14, 0),
        actualTime:    DateTime(2026, 4, 4, 14, 15),
        status:        StopStatus.completed,
        instructions:  'Drop and hook — no appointment needed.',
      ),
      StopModel(
        id:            'ST-003',
        type:          StopType.delivery,
        facilityName:  'ABC Distribution — Dallas',
        address:       '6200 Commerce Blvd',
        city:          'Dallas',
        state:         'TX',
        scheduledTime: DateTime(2026, 4, 5, 10, 0),
        status:        StopStatus.pending,
        contactName:   'Sarah Kim',
        contactPhone:  '+1 (214) 555-0200',
        dockNumber:    'Dock 12',
        instructions:  'Liftgate required. Sign in at gate first.',
      ),
    ],
  );

  /// Upcoming load (next assignment).
  static final LoadModel upcomingLoad = LoadModel(
    id:            'LD-2026-00144',
    orderNumber:   'ORD-2026-00144',
    status:        LoadStatus.assigned,
    origin:        'Dallas, TX',
    destination:   'Atlanta, GA',
    equipmentType: 'Reefer 53ft',
    loadType:      'FTL',
    weightLbs:     36000,
    commodity:     'Frozen Food',
    customerName:  'MidWest Freight LLC',
    bolNumber:     'BOL-2026-00144',
    baseRateUsd:   2800.00,
    fuelSurchargeUsd: 280.00,
    stops: [
      StopModel(
        id:            'ST-004',
        type:          StopType.pickup,
        facilityName:  'ColdChain Dallas',
        address:       '900 Industrial Way',
        city:          'Dallas',
        state:         'TX',
        scheduledTime: DateTime(2026, 4, 6, 7, 0),
        contactName:   'Tom Reed',
        contactPhone:  '+1 (214) 555-0300',
      ),
      StopModel(
        id:            'ST-005',
        type:          StopType.delivery,
        facilityName:  'Kroger DC — Atlanta',
        address:       '2100 Fulton Industrial Blvd',
        city:          'Atlanta',
        state:         'GA',
        scheduledTime: DateTime(2026, 4, 7, 9, 0),
        contactName:   'Lisa Park',
        contactPhone:  '+1 (404) 555-0400',
      ),
    ],
  );

  /// All loads accessible in the app.
  static List<LoadModel> get allLoads => [activeLoad, upcomingLoad, ..._historyLoads];

  /// Completed load history (3 entries for demo).
  static final List<LoadModel> _historyLoads = [
    LoadModel(
      id:          'LD-2026-00141',
      orderNumber: 'ORD-2026-00141',
      status:      LoadStatus.paid,
      origin:      'Los Angeles, CA',
      destination: 'Phoenix, AZ',
      equipmentType: 'Dry Van 53ft',
      loadType:    'FTL',
      weightLbs:   38000,
      commodity:   'Electronics',
      customerName:'Pacific Cargo Co.',
      bolNumber:   'BOL-2026-00141',
      baseRateUsd: 1400.00,
      fuelSurchargeUsd: 140.00,
      stops: [
        StopModel(
          id: 'ST-H1A', type: StopType.pickup,
          facilityName: 'LA Port Terminal', address: '400 Terminal Way',
          city: 'Los Angeles', state: 'CA',
          scheduledTime: DateTime(2026, 4, 3, 6, 0),
          actualTime: DateTime(2026, 4, 3, 6, 10),
          status: StopStatus.completed,
        ),
        StopModel(
          id: 'ST-H1B', type: StopType.delivery,
          facilityName: 'Phoenix Distribution', address: '1500 N 43rd Ave',
          city: 'Phoenix', state: 'AZ',
          scheduledTime: DateTime(2026, 4, 3, 18, 0),
          actualTime: DateTime(2026, 4, 3, 17, 45),
          status: StopStatus.completed,
        ),
      ],
    ),
  ];

  // ---------------------------------------------------------------------------
  // Hours of Service
  // ---------------------------------------------------------------------------

  /// Current HOS snapshot for the demo driver.
  static final HosSnapshot hosSnapshot = HosSnapshot(
    currentStatus:       DutyStatus.offDuty,
    driveMinutesUsed:    492,   // 8h 12m
    onDutyMinutesUsed:   90,    // 1h 30m
    offDutyMinutesUsed:  858,   // 14h 18m
    weeklyLogs: [
      HosDayLog(date: DateTime(2026,3,30), drivingMinutes: 630, onDutyMinutes: 60,  hasViolation: false),
      HosDayLog(date: DateTime(2026,3,31), drivingMinutes: 660, onDutyMinutes: 90,  hasViolation: false),
      HosDayLog(date: DateTime(2026,4,1),  drivingMinutes: 492, onDutyMinutes: 90,  hasViolation: false),
      HosDayLog(date: DateTime(2026,4,2),  drivingMinutes: 0,   onDutyMinutes: 0,   hasViolation: false),
      HosDayLog(date: DateTime(2026,4,3),  drivingMinutes: 570, onDutyMinutes: 120, hasViolation: false),
      HosDayLog(date: DateTime(2026,4,4),  drivingMinutes: 660, onDutyMinutes: 60,  hasViolation: false),
      HosDayLog(date: DateTime(2026,4,5),  drivingMinutes: 420, onDutyMinutes: 60,  hasViolation: false),
    ],
  );

  // ---------------------------------------------------------------------------
  // Messages
  // ---------------------------------------------------------------------------

  /// Conversations for the Messages tab.
  static final List<ConversationModel> conversations = [
    ConversationModel(
      id:                  'CONV-001',
      dispatcherName:      'Mike (Dispatcher)',
      dispatcherInitials:  'M',
      isOnline:            true,
      messages: [
        MessageModel(
          id: 'MSG-001', direction: MessageDirection.received,
          text: 'Good morning James, are you on track for the pickup today?',
          timestamp: DateTime(2026, 4, 5, 9, 15),
        ),
        MessageModel(
          id: 'MSG-002', direction: MessageDirection.sent,
          text: 'ETA to shipper looks like 8 AM',
          timestamp: DateTime(2026, 4, 5, 9, 16),
        ),
        MessageModel(
          id: 'MSG-003', direction: MessageDirection.sent,
          text: "Yes, I'm on track. Will be there by 7:45 AM.",
          timestamp: DateTime(2026, 4, 5, 9, 18),
        ),
        MessageModel(
          id: 'MSG-004', direction: MessageDirection.sent,
          text: 'Already fueled up. Ready to go!',
          timestamp: DateTime(2026, 4, 5, 9, 19),
        ),
        MessageModel(
          id: 'MSG-005', direction: MessageDirection.received,
          text: 'Perfect! Shipper contact is Bob at (312) 555-0100',
          timestamp: DateTime(2026, 4, 5, 9, 20),
        ),
        MessageModel(
          id: 'MSG-006', direction: MessageDirection.received,
          text: 'Please confirm ETA for tomorrow morning',
          timestamp: DateTime(2026, 4, 5, 9, 22),
          isRead: false,
        ),
      ],
    ),
    ConversationModel(
      id:                 'CONV-002',
      dispatcherName:     'Sarah (Dispatch Manager)',
      dispatcherInitials: 'S',
      isOnline:           false,
      messages: [
        MessageModel(
          id: 'MSG-010', direction: MessageDirection.received,
          text: 'Your settlement for week of Mar 24 has been processed.',
          timestamp: DateTime(2026, 4, 1, 14, 0),
        ),
        MessageModel(
          id: 'MSG-011', direction: MessageDirection.sent,
          text: 'Thanks! I saw the deposit come through.',
          timestamp: DateTime(2026, 4, 1, 14, 30),
        ),
      ],
    ),
  ];

  // ---------------------------------------------------------------------------
  // Settlements
  // ---------------------------------------------------------------------------

  /// Driver settlements for the last 3 periods.
  static final List<SettlementModel> settlements = [
    SettlementModel(
      id:          'SET-2026-015',
      periodStart: DateTime(2026, 3, 24),
      periodEnd:   DateTime(2026, 3, 30),
      status:      SettlementStatus.paid,
      lineItems: const [
        SettlementLineItem(description: 'ORD-00141 — LA → Phoenix',   amountUsd: 1400.00),
        SettlementLineItem(description: 'ORD-00140 — Seattle → Portland', amountUsd: 980.00),
        SettlementLineItem(description: 'Fuel Advance — Mar 25',      amountUsd: 300.00, isDeduction: true),
        SettlementLineItem(description: 'Escrow Deduction',           amountUsd: 50.00,  isDeduction: true),
        SettlementLineItem(description: 'Occupational Accident Ins.', amountUsd: 38.00,  isDeduction: true),
      ],
    ),
    SettlementModel(
      id:          'SET-2026-014',
      periodStart: DateTime(2026, 3, 17),
      periodEnd:   DateTime(2026, 3, 23),
      status:      SettlementStatus.paid,
      lineItems: const [
        SettlementLineItem(description: 'ORD-00138 — Chicago → Nashville', amountUsd: 1100.00),
        SettlementLineItem(description: 'ORD-00137 — Minneapolis → St. Louis', amountUsd: 950.00),
        SettlementLineItem(description: 'Layover Pay — Mar 19',        amountUsd: 200.00),
        SettlementLineItem(description: 'Fuel Advance — Mar 18',      amountUsd: 250.00, isDeduction: true),
        SettlementLineItem(description: 'Escrow Deduction',           amountUsd: 50.00,  isDeduction: true),
        SettlementLineItem(description: 'Occupational Accident Ins.', amountUsd: 38.00,  isDeduction: true),
      ],
    ),
    SettlementModel(
      id:          'SET-2026-016',
      periodStart: DateTime(2026, 3, 31),
      periodEnd:   DateTime(2026, 4, 6),
      status:      SettlementStatus.pending,
      lineItems: const [
        SettlementLineItem(description: 'ORD-00143 — Chicago → Dallas (in progress)', amountUsd: 2100.00),
        SettlementLineItem(description: 'Fuel Surcharge',             amountUsd: 210.00),
        SettlementLineItem(description: 'Escrow Deduction',           amountUsd: 50.00,  isDeduction: true),
        SettlementLineItem(description: 'Occupational Accident Ins.', amountUsd: 38.00,  isDeduction: true),
      ],
    ),
  ];

  // ---------------------------------------------------------------------------
  // Home screen stats (today)
  // ---------------------------------------------------------------------------

  /// Today's driving stats.
  static const int todayMiles     = 284;
  static const int todayStopsDone = 2;

  /// HOS remaining label for home screen.
  static const String hosRemainingLabel = '7h 30m';
  static const String hosStatusLabel    = '1 active load · 7h 30m drive time left';
}
