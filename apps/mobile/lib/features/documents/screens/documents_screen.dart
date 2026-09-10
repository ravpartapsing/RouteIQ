// =============================================================================
// FILE: documents_screen.dart
// PURPOSE: Grid display of driver documents with status badges.
//
// NASA RULES applied:
//   Rule 1  — no loops with unbounded conditions; static list of 6 docs.
//   Rule 3  — document data defined as compile-time const records.
//   Rule 4  — build() under 60 lines; card extracted to _DocCard widget.
//   Rule 10 — const constructors throughout.
// =============================================================================

import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../shared/widgets/status_badge.dart';

// ── Document record type ──────────────────────────────────────────────────────

typedef _DocEntry = ({
  String name,
  String subtitle,
  IconData icon,
  String statusLabel,
  Color statusBg,
  Color statusText,
});

const List<_DocEntry> _kDocs = [
  (
    name:        'CDL',
    subtitle:    'CDL-IL-842901',
    icon:        Icons.badge_outlined,
    statusLabel: 'VALID',
    statusBg:    AppColors.successLight,
    statusText:  AppColors.success,
  ),
  (
    name:        'Medical Card',
    subtitle:    'DOT Physical · Jun 2025',
    icon:        Icons.health_and_safety_outlined,
    statusLabel: 'EXPIRING',
    statusBg:    AppColors.warningLight,
    statusText:  AppColors.warning,
  ),
  (
    name:        'BOL',
    subtitle:    'BOL-2026-00143',
    icon:        Icons.description_outlined,
    statusLabel: 'VERIFIED',
    statusBg:    AppColors.successLight,
    statusText:  AppColors.success,
  ),
  (
    name:        'POD',
    subtitle:    'POD-2026-00141',
    icon:        Icons.task_outlined,
    statusLabel: 'VERIFIED',
    statusBg:    AppColors.successLight,
    statusText:  AppColors.success,
  ),
  (
    name:        'Insurance Cert',
    subtitle:    'Cargo Liability',
    icon:        Icons.shield_outlined,
    statusLabel: 'VALID',
    statusBg:    AppColors.successLight,
    statusText:  AppColors.success,
  ),
  (
    name:        'Fuel Receipt',
    subtitle:    'Apr 3 · Pilot · \$142',
    icon:        Icons.receipt_outlined,
    statusLabel: 'PENDING',
    statusBg:    AppColors.gray100,
    statusText:  AppColors.gray500,
  ),
];

// ── Screen ────────────────────────────────────────────────────────────────────

class DocumentsScreen extends StatelessWidget {
  const DocumentsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text('Documents',
            style: AppTextStyles.h3.copyWith(color: AppColors.white)),
      ),
      body: GridView.builder(
        padding: const EdgeInsets.all(AppSpacing.screenH),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: AppSpacing.md,
          mainAxisSpacing:  AppSpacing.md,
          childAspectRatio: 0.9,
        ),
        itemCount: _kDocs.length,
        itemBuilder: (_, i) => _DocCard(doc: _kDocs[i]),
      ),
    );
  }
}

// ── Document card ─────────────────────────────────────────────────────────────

class _DocCard extends StatelessWidget {
  const _DocCard({required this.doc});

  final _DocEntry doc;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(doc.icon, color: AppColors.brandPrimary, size: 32),
          const Spacer(),
          Text(doc.name,
              style: AppTextStyles.h3,
              maxLines: 1,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: AppSpacing.xs),
          Text(doc.subtitle,
              style: AppTextStyles.caption,
              maxLines: 2,
              overflow: TextOverflow.ellipsis),
          const SizedBox(height: AppSpacing.sm),
          ColorBadge(
            label:     doc.statusLabel,
            bgColor:   doc.statusBg,
            textColor: doc.statusText,
          ),
        ],
      ),
    );
  }
}
