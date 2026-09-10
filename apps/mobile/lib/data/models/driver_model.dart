// =============================================================================
// FILE: driver_model.dart
// PURPOSE: Immutable value object for the logged-in driver's profile.
//
// NASA RULE 3 — all fields final; object is immutable post-construction.
// =============================================================================

/// Immutable data object representing the current driver's profile.
final class DriverModel {
  const DriverModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.cdlNumber,
    required this.cdlClass,
    required this.cdlExpiry,
    required this.medicalExpiry,
    required this.driverType,
    required this.employeeNumber,
    required this.phone,
    this.email,
    this.onTimePercent   = 0.0,
    this.totalLoads      = 0,
    this.totalMilesDriven = 0,
    this.safetyScore     = 0.0,
  });

  final String   id;
  final String   firstName;
  final String   lastName;
  final String   cdlNumber;
  final String   cdlClass;   // "CDL-A", "CDL-B"
  final DateTime cdlExpiry;
  final DateTime medicalExpiry;
  final String   driverType; // "Company", "Owner-Op", "Lease"
  final String   employeeNumber;
  final String   phone;
  final String?  email;

  // Performance metrics
  final double onTimePercent;
  final int    totalLoads;
  final int    totalMilesDriven;
  final double safetyScore;

  /// Full display name.
  String get fullName => '$firstName $lastName';

  /// Returns driver's initials for avatar fallback.
  String get initials =>
      '${firstName.isNotEmpty ? firstName[0] : ""}${lastName.isNotEmpty ? lastName[0] : ""}';

  /// Returns whether CDL expires within 90 days.
  bool get cdlExpiringSoon =>
      cdlExpiry.difference(DateTime.now()).inDays <= 90;

  /// Returns whether medical card expires within 60 days.
  bool get medicalExpiringSoon =>
      medicalExpiry.difference(DateTime.now()).inDays <= 60;
}
