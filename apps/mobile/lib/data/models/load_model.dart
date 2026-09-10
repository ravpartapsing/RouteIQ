// =============================================================================
// FILE: load_model.dart
// PURPOSE: Immutable value objects for loads and stops.
//
// NASA RULES applied:
//   Rule 1  — simple control flow; no complex conditionals in model layer.
//   Rule 3  — all fields are final; models are immutable after construction.
//   Rule 10 — compile-time const constructors where possible.
// =============================================================================

/// Represents the operational status of a load.
enum LoadStatus {
  draft,
  confirmed,
  assigned,
  dispatched,
  inTransit,
  delivered,
  invoiced,
  paid,
  cancelled,
}

/// Represents the type of a stop on a load.
enum StopType { pickup, delivery, waypoint }

/// Represents the completion state of a single stop.
enum StopStatus { pending, arrived, completed }

// -----------------------------------------------------------------------------
// StopModel — a single stop on a load's route.
// -----------------------------------------------------------------------------

/// Immutable data object for a single stop.
final class StopModel {
  const StopModel({
    required this.id,
    required this.type,
    required this.facilityName,
    required this.address,
    required this.city,
    required this.state,
    required this.scheduledTime,
    this.actualTime,
    this.status = StopStatus.pending,
    this.contactName,
    this.contactPhone,
    this.instructions,
    this.dockNumber,
  });

  final String      id;
  final StopType    type;
  final String      facilityName;
  final String      address;
  final String      city;
  final String      state;
  final DateTime    scheduledTime;
  final DateTime?   actualTime;
  final StopStatus  status;
  final String?     contactName;
  final String?     contactPhone;
  final String?     instructions;
  final String?     dockNumber;

  /// Returns a full single-line address string.
  String get fullAddress => '$address, $city, $state';

  /// Returns whether this stop has been completed.
  bool get isCompleted => status == StopStatus.completed;

  /// Returns whether this stop is currently active.
  bool get isActive => status == StopStatus.arrived;
}

// -----------------------------------------------------------------------------
// LoadModel — a single freight load assignment.
// -----------------------------------------------------------------------------

/// Immutable data object for a freight load.
final class LoadModel {
  const LoadModel({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.origin,
    required this.destination,
    required this.stops,
    required this.equipmentType,
    required this.loadType,
    required this.weightLbs,
    required this.commodity,
    this.customerName,
    this.bolNumber,
    this.baseRateUsd = 0.0,
    this.fuelSurchargeUsd = 0.0,
    this.specialInstructions,
  });

  final String        id;
  final String        orderNumber;
  final LoadStatus    status;
  final String        origin;         // "Chicago, IL"
  final String        destination;    // "Dallas, TX"
  final List<StopModel> stops;
  final String        equipmentType;  // "Dry Van 53ft"
  final String        loadType;       // "FTL"
  final int           weightLbs;
  final String        commodity;
  final String?       customerName;
  final String?       bolNumber;
  final double        baseRateUsd;
  final double        fuelSurchargeUsd;
  final String?       specialInstructions;

  /// Total contracted rate including surcharge.
  double get totalRateUsd => baseRateUsd + fuelSurchargeUsd;

  /// Returns the next incomplete stop, or null when all stops are done.
  StopModel? get nextStop {
    for (final stop in stops) {
      if (!stop.isCompleted) return stop;
    }
    return null;
  }

  /// Returns count of completed stops.
  int get completedStopCount =>
      stops.where((s) => s.isCompleted).length;
}
