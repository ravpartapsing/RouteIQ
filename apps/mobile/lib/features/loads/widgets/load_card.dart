// =============================================================================
// FILE: load_card.dart
// PURPOSE: Reusable card for a single LoadModel in list views.
//
// NASA RULES applied:
//   Rule 3  — stateless; no mutable state; all data via constructor params.
//   Rule 4  — build() under 60 lines; row sections extracted to helpers.
//   Rule 10 — const constructor.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/load_model.dart';
import '../../../shared/widgets/status_badge.dart';

class LoadCard extends StatelessWidget {
  const LoadCard({super.key, required this.load, required this.onTap});

  final LoadModel   load;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.white,
          border: Border.all(color: AppColors.gray200),
          borderRadius: BorderRadius.circular(AppRadius.card),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _RouteInfo(load: load)),
            const SizedBox(width: AppSpacing.md),
            _StatusColumn(load: load),
          ],
        ),
      ),
    );
  }
}

// ── Left: route info ──────────────────────────────────────────────────────────

class _RouteInfo extends StatelessWidget {
  const _RouteInfo({required this.load});

  final LoadModel load;

  @override
  Widget build(BuildContext context) {
    final firstStop = load.stops.isNotEmpty ? load.stops.first : null;
    final dateLabel = firstStop != null
        ? DateFormat('MMM d, h:mm a').format(firstStop.scheduledTime)
        : '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(load.orderNumber,
            style: AppTextStyles.label.copyWith(color: AppColors.brandPrimary)),
        const SizedBox(height: AppSpacing.xs),
        Text('${load.origin}  →  ${load.destination}',
            style: AppTextStyles.h3),
        if (load.customerName != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(load.customerName!,
              style: AppTextStyles.bodySm),
        ],
        if (dateLabel.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(dateLabel, style: AppTextStyles.caption),
        ],
      ],
    );
  }
}

// ── Right: status badge ───────────────────────────────────────────────────────

class _StatusColumn extends StatelessWidget {
  const _StatusColumn({required this.load});

  final LoadModel load;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        LoadStatusBadge(status: load.status),
        const SizedBox(height: AppSpacing.xs),
        Text(load.equipmentType,
            style: AppTextStyles.caption,
            textAlign: TextAlign.right),
      ],
    );
  }
}
