// =============================================================================
// FILE: status_badge.dart
// PURPOSE: Pill-shaped status badge — reused across Loads, HOS, Documents.
//
// NASA RULE 3 — colour map is compile-time const.
// NASA RULE 4 — build() under 40 lines.
// =============================================================================

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import '../../data/models/load_model.dart';

/// Maps a LoadStatus to its badge colours.
({Color bg, Color text}) _colorsForStatus(LoadStatus status) => switch (status) {
  LoadStatus.inTransit  => (bg: AppColors.infoLight,    text: AppColors.info),
  LoadStatus.delivered  => (bg: AppColors.successLight, text: AppColors.success),
  LoadStatus.assigned   => (bg: AppColors.warningLight, text: AppColors.warning),
  LoadStatus.dispatched => (bg: const Color(0xFFF3E8FF), text: const Color(0xFF7C3AED)),
  LoadStatus.confirmed  => (bg: AppColors.infoLight,    text: AppColors.brandPrimary),
  LoadStatus.paid       => (bg: AppColors.successLight, text: AppColors.success),
  LoadStatus.invoiced   => (bg: AppColors.successLight, text: AppColors.success),
  LoadStatus.cancelled  => (bg: AppColors.dangerLight,  text: AppColors.danger),
  LoadStatus.draft      => (bg: AppColors.gray100,      text: AppColors.gray500),
};

String _labelForStatus(LoadStatus status) => switch (status) {
  LoadStatus.inTransit  => 'IN TRANSIT',
  LoadStatus.delivered  => 'DELIVERED',
  LoadStatus.assigned   => 'ASSIGNED',
  LoadStatus.dispatched => 'DISPATCHED',
  LoadStatus.confirmed  => 'CONFIRMED',
  LoadStatus.paid       => 'PAID',
  LoadStatus.invoiced   => 'INVOICED',
  LoadStatus.cancelled  => 'CANCELLED',
  LoadStatus.draft      => 'DRAFT',
};

/// A rounded pill badge that reflects a load's status.
class LoadStatusBadge extends StatelessWidget {
  const LoadStatusBadge({super.key, required this.status});

  final LoadStatus status;

  @override
  Widget build(BuildContext context) {
    final colors = _colorsForStatus(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color:        colors.bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _labelForStatus(status),
        style: AppTextStyles.label.copyWith(
          color:       colors.text,
          fontWeight:  FontWeight.w700,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

/// Generic colour badge for arbitrary labels (HOS status, doc status, etc.).
class ColorBadge extends StatelessWidget {
  const ColorBadge({
    super.key,
    required this.label,
    required this.bgColor,
    required this.textColor,
  });

  final String label;
  final Color  bgColor;
  final Color  textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color:        bgColor,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: AppTextStyles.label.copyWith(
          color:       textColor,
          fontWeight:  FontWeight.w700,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}
