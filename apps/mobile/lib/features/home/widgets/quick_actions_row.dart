// =============================================================================
// FILE: quick_actions_row.dart
// PURPOSE: Navigate / Check Call / Delay action buttons row on Home screen.
// =============================================================================

import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';

class QuickActionsRow extends StatelessWidget {
  const QuickActionsRow({super.key, required this.onNavigate});
  final VoidCallback onNavigate;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _ActionButton(
          label:   AppStrings.navigate,
          icon:    Icons.navigation_outlined,
          primary: true,
          onTap:   onNavigate,
        ),
        const SizedBox(width: AppSpacing.sm),
        _ActionButton(
          label: AppStrings.checkCall,
          icon:  Icons.phone_in_talk_outlined,
          onTap: () => _showCheckCallSheet(context),
        ),
        const SizedBox(width: AppSpacing.sm),
        _ActionButton(
          label: AppStrings.delay,
          icon:  Icons.warning_amber_outlined,
          onTap: () => _showDelaySheet(context),
        ),
      ],
    );
  }

  void _showCheckCallSheet(BuildContext context) {
    showModalBottomSheet(
      context:     context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      builder: (_) => const _CheckCallSheet(),
    );
  }

  void _showDelaySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      builder: (_) => const _DelaySheet(),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
    this.primary = false,
  });

  final String     label;
  final IconData   icon;
  final VoidCallback onTap;
  final bool       primary;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: primary ? AppColors.brandPrimary : AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.gray200),
          ),
          child: Column(
            children: [
              Icon(icon,
                  color: primary ? AppColors.white : AppColors.gray700,
                  size: 22),
              const SizedBox(height: 4),
              Text(label,
                  style: AppTextStyles.bodySm.copyWith(
                    color: primary ? AppColors.white : AppColors.gray700,
                    fontWeight: FontWeight.w600,
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Check-Call bottom sheet ───────────────────────────────────────────────────

class _CheckCallSheet extends StatefulWidget {
  const _CheckCallSheet();
  @override
  State<_CheckCallSheet> createState() => _CheckCallSheetState();
}

class _CheckCallSheetState extends State<_CheckCallSheet> {
  final _noteCtrl = TextEditingController();

  @override
  void dispose() { _noteCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: AppSpacing.lg, right: AppSpacing.lg, top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl2,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.gray300,
                borderRadius: BorderRadius.circular(2)),
          )),
          const SizedBox(height: AppSpacing.lg),
          const Text('Check Call', style: AppTextStyles.h2),
          const SizedBox(height: AppSpacing.sm),
          const Text('Chicago, IL — I-90 W  ·  Auto-detected',
              style: AppTextStyles.bodySm),
          const SizedBox(height: AppSpacing.lg),
          TextField(
            controller:  _noteCtrl,
            maxLines:    3,
            decoration:  const InputDecoration(
              hintText: 'Add notes (e.g. traffic, delay reason)…',
              filled:   true,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Send Check-Call'),
          ),
        ],
      ),
    );
  }
}

// ── Delay report bottom sheet ─────────────────────────────────────────────────

class _DelaySheet extends StatefulWidget {
  const _DelaySheet();
  @override
  State<_DelaySheet> createState() => _DelaySheetState();
}

class _DelaySheetState extends State<_DelaySheet> {
  static const List<String> _reasons = [
    'Traffic', 'Weather', 'Mechanical Issue',
    'Shipper Delay', 'Receiver Delay', 'Accident', 'Other',
  ];
  String _selected = 'Traffic';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Report Delay', style: AppTextStyles.h2),
          const SizedBox(height: AppSpacing.lg),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _reasons.map((r) => ChoiceChip(
              label:     Text(r),
              selected:  _selected == r,
              onSelected: (_) => setState(() => _selected = r),
              selectedColor: AppColors.accentLight,
              labelStyle: AppTextStyles.bodySm.copyWith(
                color: _selected == r ? AppColors.brandPrimary : AppColors.gray700,
              ),
            )).toList(),
          ),
          const SizedBox(height: AppSpacing.lg),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Submit Delay Report'),
          ),
        ],
      ),
    );
  }
}
