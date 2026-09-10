// =============================================================================
// FILE: settlement_model.dart
// PURPOSE: Immutable value objects for driver pay settlements.
//
// NASA RULE 3 — all fields final.
// =============================================================================

/// Payment status of a settlement period.
enum SettlementStatus { pending, approved, paid }

/// A single line item inside a settlement (earning or deduction).
final class SettlementLineItem {
  const SettlementLineItem({
    required this.description,
    required this.amountUsd,
    this.isDeduction = false,
  });

  final String description;
  final double amountUsd;
  final bool   isDeduction;
}

/// A single pay-period settlement for the driver.
final class SettlementModel {
  const SettlementModel({
    required this.id,
    required this.periodStart,
    required this.periodEnd,
    required this.status,
    required this.lineItems,
  });

  final String             id;
  final DateTime           periodStart;
  final DateTime           periodEnd;
  final SettlementStatus   status;
  final List<SettlementLineItem> lineItems;

  /// Sum of all non-deduction line items.
  double get grossPay =>
      lineItems.where((i) => !i.isDeduction).fold(0.0, (s, i) => s + i.amountUsd);

  /// Sum of all deduction line items.
  double get totalDeductions =>
      lineItems.where((i) => i.isDeduction).fold(0.0, (s, i) => s + i.amountUsd);

  /// Net pay = gross - deductions.
  double get netPay => grossPay - totalDeductions;
}
