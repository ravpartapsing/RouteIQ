// =============================================================================
// FILE: delivery_screen.dart
// PURPOSE: Delivery completion screen — POD photo + consignee signature.
//
// NASA RULES applied:
//   Rule 1  — simple boolean state flags; no nested stateful logic.
//   Rule 3  — data from MockDataSource; strings from AppStrings.
//   Rule 4  — build() under 60 lines; sections extracted to sub-widgets.
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

class DeliveryScreen extends StatefulWidget {
  const DeliveryScreen({super.key, required this.loadId});

  final String loadId;

  @override
  State<DeliveryScreen> createState() => _DeliveryScreenState();
}

class _DeliveryScreenState extends State<DeliveryScreen> {
  bool _photoTaken    = false;
  bool _signatureDone = false;

  LoadModel get _load =>
      MockDataSource.allLoads.firstWhere((l) => l.id == widget.loadId);

  StopModel get _deliveryStop =>
      _load.stops.lastWhere((s) => s.type == StopType.delivery);

  @override
  Widget build(BuildContext context) {
    final facilityName = _deliveryStop.facilityName;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.success,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: const Text(AppStrings.completeDelivery),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenH),
        children: [
          _DeliveryHeader(facilityName: facilityName),
          const SizedBox(height: AppSpacing.xl),
          _PodPhotoSection(
            taken: _photoTaken,
            onTap: () => setState(() => _photoTaken = true),
          ),
          const SizedBox(height: AppSpacing.xl),
          _SignatureSection(
            done: _signatureDone,
            onTap: () => setState(() => _signatureDone = true),
          ),
          const SizedBox(height: AppSpacing.xl2),
          SizedBox(
            width: double.infinity,
            child: AppButton(
              label: AppStrings.completeDelivery,
              onPressed: () => _onComplete(context),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
      ),
    );
  }

  void _onComplete(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delivery Complete!'),
        content: const Text('POD submitted successfully.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              context.go('/loads');
            },
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}

// ── Green header ──────────────────────────────────────────────────────────────

class _DeliveryHeader extends StatelessWidget {
  const _DeliveryHeader({required this.facilityName});

  final String facilityName;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.successLight,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.check_circle, color: AppColors.success, size: 28),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              'Complete Delivery at $facilityName',
              style: AppTextStyles.h3.copyWith(color: AppColors.success),
            ),
          ),
        ],
      ),
    );
  }
}

// ── POD photo section ─────────────────────────────────────────────────────────

class _PodPhotoSection extends StatelessWidget {
  const _PodPhotoSection({required this.taken, required this.onTap});

  final bool     taken;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppStrings.podPhoto, style: AppTextStyles.h3),
        const SizedBox(height: AppSpacing.md),
        GestureDetector(
          onTap: onTap,
          child: Container(
            height: 130,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border.all(
                color: taken ? AppColors.success : AppColors.gray300,
                width: taken ? 2 : 1,
                style: taken ? BorderStyle.solid : BorderStyle.solid,
              ),
            ),
            child: taken
                ? const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle, color: AppColors.success, size: 36),
                      SizedBox(height: AppSpacing.sm),
                      Text('Photo captured', style: AppTextStyles.body),
                    ],
                  )
                : const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt_outlined, color: AppColors.gray400, size: 32),
                      SizedBox(height: AppSpacing.sm),
                      Text(AppStrings.tapCapture,
                          style: AppTextStyles.bodySm),
                    ],
                  ),
          ),
        ),
      ],
    );
  }
}

// ── Signature section ─────────────────────────────────────────────────────────

class _SignatureSection extends StatelessWidget {
  const _SignatureSection({required this.done, required this.onTap});

  final bool     done;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppStrings.consigneeSign, style: AppTextStyles.h3),
        const SizedBox(height: AppSpacing.md),
        GestureDetector(
          onTap: onTap,
          child: Container(
            height: 120,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.white,
              borderRadius: BorderRadius.circular(AppRadius.card),
              border: Border.all(color: AppColors.gray200),
            ),
            alignment: Alignment.center,
            child: done
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle, color: AppColors.success, size: 22),
                      const SizedBox(width: AppSpacing.sm),
                      Text('Signature captured',
                          style: AppTextStyles.body.copyWith(color: AppColors.success)),
                    ],
                  )
                : Text(AppStrings.signAboveLine,
                    style: AppTextStyles.body.copyWith(color: AppColors.gray400)),
          ),
        ),
      ],
    );
  }
}
