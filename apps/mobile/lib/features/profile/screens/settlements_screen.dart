// =============================================================================
// FILE: settlements_screen.dart
// PURPOSE: Driver pay settlements list with expandable line-item detail.
//
// NASA RULES applied:
//   Rule 3  — data from MockDataSource.settlements; no inline literals.
//   Rule 4  — build() under 60 lines; ExpansionTile handles expand state.
//   Rule 10 — const constructors where possible.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/settlement_model.dart';
import '../../../data/static/mock_data.dart';
import '../../../shared/widgets/status_badge.dart';

class SettlementsScreen extends StatelessWidget {
  const SettlementsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final items = MockDataSource.settlements;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(AppStrings.settlements,
            style: AppTextStyles.h3.copyWith(color: AppColors.white)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.screenH),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (_, i) => _SettlementCard(settlement: items[i]),
      ),
    );
  }
}

// ── Settlement expansion card ─────────────────────────────────────────────────

class _SettlementCard extends StatelessWidget {
  const _SettlementCard({required this.settlement});

  final SettlementModel settlement;

  ({Color bg, Color text}) get _badgeColors => switch (settlement.status) {
    SettlementStatus.paid     => (bg: AppColors.successLight, text: AppColors.success),
    SettlementStatus.approved => (bg: AppColors.infoLight,    text: AppColors.accentBlue),
    SettlementStatus.pending  => (bg: AppColors.gray100,      text: AppColors.gray500),
  };

  String get _statusLabel => switch (settlement.status) {
    SettlementStatus.paid     => 'PAID',
    SettlementStatus.approved => 'APPROVED',
    SettlementStatus.pending  => 'PENDING',
  };

  @override
  Widget build(BuildContext context) {
    final fmt    = DateFormat('MMM d, yyyy');
    final moneyfmt = NumberFormat.currency(symbol: '\$');
    final colors = _badgeColors;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.gray200),
      ),
      child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
        childrenPadding: EdgeInsets.zero,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  '${fmt.format(settlement.periodStart)} – ${fmt.format(settlement.periodEnd)}',
                  style: AppTextStyles.h3,
                ),
                const Spacer(),
                ColorBadge(
                  label:     _statusLabel,
                  bgColor:   colors.bg,
                  textColor: colors.text,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Gross: ${moneyfmt.format(settlement.grossPay)}  ·  Net: ${moneyfmt.format(settlement.netPay)}',
              style: AppTextStyles.bodySm,
            ),
          ],
        ),
        children: [
          const Divider(height: 1, color: AppColors.gray100),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: _LineItemList(settlement: settlement),
          ),
        ],
      ),
    );
  }
}

// ── Line-item list ────────────────────────────────────────────────────────────

class _LineItemList extends StatelessWidget {
  const _LineItemList({required this.settlement});

  final SettlementModel settlement;

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(symbol: '\$');
    return Column(
      children: [
        ...settlement.lineItems.map((item) {
          final color = item.isDeduction ? AppColors.danger : AppColors.gray700;
          final prefix = item.isDeduction ? '– ' : '';
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(item.description, style: AppTextStyles.bodySm),
                ),
                Text(
                  '$prefix${fmt.format(item.amountUsd)}',
                  style: AppTextStyles.body.copyWith(color: color),
                ),
              ],
            ),
          );
        }),
        const Divider(color: AppColors.gray200),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Net Pay',
                style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w700)),
            Text(
              fmt.format(settlement.netPay),
              style: AppTextStyles.h3.copyWith(color: AppColors.brandPrimary),
            ),
          ],
        ),
      ],
    );
  }
}
