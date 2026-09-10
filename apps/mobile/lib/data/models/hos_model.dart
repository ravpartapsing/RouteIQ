// =============================================================================
// FILE: hos_model.dart
// PURPOSE: Immutable value objects for Hours of Service tracking.
//
// NASA RULE 3 — all fields final.
// =============================================================================

/// FMCSA duty status categories.
enum DutyStatus { offDuty, sleeperBerth, driving, onDutyNotDriving }

/// A single day in the 7-day HOS log.
final class HosDayLog {
  const HosDayLog({
    required this.date,
    required this.drivingMinutes,
    required this.onDutyMinutes,
    required this.hasViolation,
  });

  final DateTime date;
  final int      drivingMinutes;
  final int      onDutyMinutes;
  final bool     hasViolation;

  /// Driving hours for display (e.g. 8.2).
  double get drivingHours => drivingMinutes / 60.0;

  /// Total on-duty hours for display.
  double get totalOnDutyHours => (drivingMinutes + onDutyMinutes) / 60.0;
}

/// Snapshot of the driver's current HOS state.
final class HosSnapshot {
  const HosSnapshot({
    required this.currentStatus,
    required this.driveMinutesUsed,
    required this.onDutyMinutesUsed,
    required this.offDutyMinutesUsed,
    required this.weeklyLogs,
  });

  /// FMCSA daily driving limit in minutes (11 hours).
  static const int kDailyDriveLimitMin  = 660;

  /// FMCSA daily on-duty limit in minutes (14 hours).
  static const int kDailyOnDutyLimitMin = 840;

  final DutyStatus      currentStatus;
  final int             driveMinutesUsed;
  final int             onDutyMinutesUsed;
  final int             offDutyMinutesUsed;
  final List<HosDayLog> weeklyLogs;

  /// Remaining drive minutes today.
  int get driveMinutesRemaining =>
      (kDailyDriveLimitMin - driveMinutesUsed).clamp(0, kDailyDriveLimitMin);

  /// Drive time remaining as 0.0–1.0 fraction (for progress bar).
  double get driveProgressFraction =>
      driveMinutesUsed / kDailyDriveLimitMin;

  /// Whether driver is within 60 minutes of their daily limit.
  bool get isNearLimit => driveMinutesRemaining <= 60;

  /// Remaining drive time as display string, e.g. "7h 30m".
  String get driveRemainingLabel {
    final h = driveMinutesRemaining ~/ 60;
    final m = driveMinutesRemaining % 60;
    return '${h}h ${m}m';
  }
}
