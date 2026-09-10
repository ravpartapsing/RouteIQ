// =============================================================================
// FILE: stop_timeline.dart
// PURPOSE: Vertical timeline item for each stop in a load's route.
//
// NASA RULES applied:
//   Rule 3  — stateless; all appearance derived from StopModel fields.
//   Rule 4  — build() under 60 lines; helpers extract dot/line and text.
//   Rule 10 — const constructor.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/load_model.dart';

class StopTimelineItem extends StatelessWidget {
  const StopTimelineItem({
    super.key,
    required this.stop,
    required this.isLast,
  });

  final StopModel stop;
  final bool      isLast;

  Color get _dotColor {
    if (stop.isCompleted) return AppColors.success;
    if (stop.isActive)   return AppColors.accentBlue;
    return AppColors.gray300;
  }

  bool get _isMuted => !stop.isCompleted && !stop.isActive;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _TimelineDotColumn(dotColor: _dotColor, showLine: !isLast),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: _StopContent(stop: stop, isMuted: _isMuted, isActive: stop.isActive),
          ),
        ],
      ),
    );
  }
}

// ── Left: dot + vertical line ─────────────────────────────────────────────────

class _TimelineDotColumn extends StatelessWidget {
  const _TimelineDotColumn({required this.dotColor, required this.showLine});

  final Color dotColor;
  final bool  showLine;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: dotColor,
            shape: BoxShape.circle,
            border: Border.all(color: dotColor),
          ),
        ),
        if (showLine)
          Expanded(
            child: Container(
              width: 2,
              color: AppColors.gray200,
            ),
          ),
      ],
    );
  }
}

// ── Right: stop detail text ───────────────────────────────────────────────────

class _StopContent extends StatelessWidget {
  const _StopContent({
    required this.stop,
    required this.isMuted,
    required this.isActive,
  });

  final StopModel stop;
  final bool      isMuted;
  final bool      isActive;

  String get _stopTypeLabel => switch (stop.type) {
    StopType.pickup   => 'PICKUP',
    StopType.delivery => 'DELIVERY',
    StopType.waypoint => 'WAYPOINT',
  };

  @override
  Widget build(BuildContext context) {
    final textOpacity = isMuted ? 0.5 : 1.0;
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      padding: isActive
          ? const EdgeInsets.all(AppSpacing.md)
          : EdgeInsets.zero,
      decoration: isActive
          ? BoxDecoration(
              border: const Border(
                left: BorderSide(color: AppColors.accentBlue, width: 3),
              ),
              color: AppColors.accentLight,
              borderRadius: BorderRadius.circular(AppRadius.sm),
            )
          : null,
      child: Opacity(
        opacity: textOpacity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_stopTypeLabel,
                style: AppTextStyles.label.copyWith(
                  color: isActive ? AppColors.accentBlue : AppColors.gray500,
                  letterSpacing: 0.8,
                )),
            const SizedBox(height: AppSpacing.xs),
            Text(stop.facilityName,
                style: AppTextStyles.h3),
            const SizedBox(height: AppSpacing.xs),
            Text(stop.fullAddress,
                style: AppTextStyles.bodySm),
            const SizedBox(height: AppSpacing.xs),
            Text(
              DateFormat('EEE, MMM d · h:mm a').format(stop.scheduledTime),
              style: AppTextStyles.caption,
            ),
          ],
        ),
      ),
    );
  }
}
