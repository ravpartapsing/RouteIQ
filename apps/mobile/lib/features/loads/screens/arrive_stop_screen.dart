// =============================================================================
// FILE: arrive_stop_screen.dart
// PURPOSE: Arrival confirmation screen for the driver's next stop.
//
// NASA RULES applied:
//   Rule 1  — simple control flow; no nested conditionals.
//   Rule 3  — data from MockDataSource; timestamp from DateTime.now().
//   Rule 4  — build() under 60 lines; sections extracted as sub-widgets.
//   Rule 10 — const constructor.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/load_model.dart';
import '../../../data/static/mock_data.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';

class ArriveStopScreen extends StatelessWidget {
  const ArriveStopScreen({super.key, required this.loadId});

  final String loadId;

  LoadModel get _load =>
      MockDataSource.allLoads.firstWhere((l) => l.id == loadId);

  @override
  Widget build(BuildContext context) {
    final load     = _load;
    final nextStop = load.nextStop ?? load.stops.last;
    final now      = DateTime.now();
    final tsLabel  = DateFormat('EEE, MMM d · h:mm a').format(now);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        title: const Text('Arrive at Stop'),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenH),
        children: [
          const SizedBox(height: AppSpacing.lg),
          _StopHeader(stop: nextStop),
          const SizedBox(height: AppSpacing.xl2),
          _ArrivalTimestamp(label: tsLabel),
          const SizedBox(height: AppSpacing.xl),
          const _PhotoButton(),
          const SizedBox(height: AppSpacing.xl),
          _ConfirmButton(loadId: loadId),
        ],
      ),
    );
  }
}

// ── Stop header card ──────────────────────────────────────────────────────────

class _StopHeader extends StatelessWidget {
  const _StopHeader({required this.stop});

  final StopModel stop;

  String get _stopTypeLabel => switch (stop.type) {
    StopType.pickup   => 'PICKUP',
    StopType.delivery => 'DELIVERY',
    StopType.waypoint => 'WAYPOINT',
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ColorBadge(
            label: _stopTypeLabel,
            bgColor: AppColors.infoLight,
            textColor: AppColors.accentBlue,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Confirm Arrival at ${stop.facilityName}',
            style: AppTextStyles.h2,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(stop.fullAddress, style: AppTextStyles.body),
          const SizedBox(height: AppSpacing.xs),
          Text(
            DateFormat('EEE, MMM d · h:mm a').format(stop.scheduledTime),
            style: AppTextStyles.caption,
          ),
        ],
      ),
    );
  }
}

// ── Auto-filled timestamp ─────────────────────────────────────────────────────

class _ArrivalTimestamp extends StatelessWidget {
  const _ArrivalTimestamp({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.gray50,
        borderRadius: BorderRadius.circular(AppRadius.input),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Row(
        children: [
          const Icon(Icons.access_time, color: AppColors.gray400, size: 20),
          const SizedBox(width: AppSpacing.sm),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Arrival Time', style: AppTextStyles.label),
              const SizedBox(height: AppSpacing.xs),
              Text(label, style: AppTextStyles.body),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Photo button ──────────────────────────────────────────────────────────────

class _PhotoButton extends StatelessWidget {
  const _PhotoButton();

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      icon: const Icon(Icons.camera_alt_outlined),
      label: const Text('Take Arrival Photo'),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 52),
        foregroundColor: AppColors.brandPrimary,
        side: const BorderSide(color: AppColors.brandPrimary),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
      ),
      onPressed: () {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Camera opening...')),
        );
      },
    );
  }
}

// ── Confirm arrival button ────────────────────────────────────────────────────

class _ConfirmButton extends StatelessWidget {
  const _ConfirmButton({required this.loadId});

  final String loadId;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: AppButton(
        label: AppStrings.confirmArrival,
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Arrival confirmed!')),
          );
          context.pop();
        },
      ),
    );
  }
}
