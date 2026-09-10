// =============================================================================
// FILE: load_detail_screen.dart
// PURPOSE: Full detail view for a single load — header, stops timeline, actions.
//
// NASA RULES applied:
//   Rule 1  — simple linear flow; no nested conditionals in build().
//   Rule 3  — data fetched from MockDataSource by id; no inline literals.
//   Rule 4  — build() under 60 lines; header, info strip, stops extracted.
//   Rule 10 — const constructor.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/load_model.dart';
import '../../../data/static/mock_data.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../widgets/stop_timeline.dart';

class LoadDetailScreen extends StatelessWidget {
  const LoadDetailScreen({super.key, required this.loadId});

  final String loadId;

  LoadModel get _load =>
      MockDataSource.allLoads.firstWhere((l) => l.id == loadId);

  @override
  Widget build(BuildContext context) {
    final load = _load;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(load.orderNumber, style: AppTextStyles.h3.copyWith(color: AppColors.white)),
      ),
      body: Column(
        children: [
          _LoadInfoStrip(load: load),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.screenH),
              children: [
                _StopsSection(load: load),
                const SizedBox(height: AppSpacing.xl2),
                _ActionButtons(loadId: loadId),
                const SizedBox(height: AppSpacing.lg),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Blue info strip ───────────────────────────────────────────────────────────

class _LoadInfoStrip extends StatelessWidget {
  const _LoadInfoStrip({required this.load});

  final LoadModel load;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: AppColors.brandPrimary,
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenH, 0, AppSpacing.screenH, AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${load.origin}  →  ${load.destination}',
            style: AppTextStyles.h2.copyWith(color: AppColors.white),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              LoadStatusBadge(status: load.status),
              const SizedBox(width: AppSpacing.md),
              Text(
                '${load.equipmentType}  ·  ${(load.weightLbs / 1000).toStringAsFixed(0)}k lbs  ·  ${load.commodity}',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.accentLight),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Stops section ─────────────────────────────────────────────────────────────

class _StopsSection extends StatelessWidget {
  const _StopsSection({required this.load});

  final LoadModel load;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Stops', style: AppTextStyles.h3),
        const SizedBox(height: AppSpacing.lg),
        ...List.generate(load.stops.length, (i) {
          return StopTimelineItem(
            stop: load.stops[i],
            isLast: i == load.stops.length - 1,
          );
        }),
      ],
    );
  }
}

// ── Bottom action buttons ─────────────────────────────────────────────────────

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({required this.loadId});

  final String loadId;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: AppButton(
            label: AppStrings.arriveNextStop,
            onPressed: () => context.go('/loads/$loadId/arrive'),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        SizedBox(
          width: double.infinity,
          child: AppButton(
            label: AppStrings.viewOnMap,
            style: AppButtonStyle.ghost,
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Map view coming soon')),
              );
            },
          ),
        ),
      ],
    );
  }
}
