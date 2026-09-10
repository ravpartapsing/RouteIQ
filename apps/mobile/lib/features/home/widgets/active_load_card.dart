// =============================================================================
// FILE: active_load_card.dart
// PURPOSE: Card showing the active load's route and next stop details.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/load_model.dart';
import '../../../shared/widgets/status_badge.dart';

class ActiveLoadCard extends StatelessWidget {
  const ActiveLoadCard({super.key, required this.load});
  final LoadModel load;

  @override
  Widget build(BuildContext context) {
    final next = load.nextStop;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color:        AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border:       Border.all(color: AppColors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(load.orderNumber, style: AppTextStyles.bodySm),
              LoadStatusBadge(status: load.status),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),

          // Route
          Text(
            '${load.origin}  →  ${load.destination}',
            style: AppTextStyles.h3,
          ),
          const SizedBox(height: AppSpacing.lg),

          // Next stop card (blue highlight)
          if (next != null)
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color:        AppColors.accentLight,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border:       Border.all(color: AppColors.accentBlue.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(AppStrings.nextStop,
                      style: AppTextStyles.label
                          .copyWith(color: AppColors.accentBlue)),
                  const SizedBox(height: 4),
                  Text(next.facilityName, style: AppTextStyles.bodyLg
                      .copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(
                    'ETA ${DateFormat('h:mm a').format(next.scheduledTime)}'
                    ' · ${_distanceLabel(next)} mi via I-55 S',
                    style: AppTextStyles.bodySm,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  // Placeholder distance (static for demo).
  String _distanceLabel(StopModel stop) => '68';
}
