// =============================================================================
// FILE: hos_log_screen.dart
// PURPOSE: Hours of Service log — current status, today's time, 7-day log.
//
// NASA RULES applied:
//   Rule 1  — simple toggle state; ToggleButtons index update only.
//   Rule 3  — all HOS data from MockDataSource.hosSnapshot.
//   Rule 4  — build() under 60 lines; each section is a separate widget.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/hos_model.dart';
import '../../../data/static/mock_data.dart';

class HosLogScreen extends StatefulWidget {
  const HosLogScreen({super.key});

  @override
  State<HosLogScreen> createState() => _HosLogScreenState();
}

class _HosLogScreenState extends State<HosLogScreen> {
  // 0=offDuty, 1=sleeper, 2=driving, 3=onDuty
  int _selectedStatus = 0;

  @override
  Widget build(BuildContext context) {
    final hos = MockDataSource.hosSnapshot;
    final anyViolation = hos.weeklyLogs.any((d) => d.hasViolation);
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(AppStrings.hosTitle,
            style: AppTextStyles.h3.copyWith(color: AppColors.white)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenH),
        children: [
          _StatusToggleSection(
            selected: _selectedStatus,
            onChanged: (i) => setState(() => _selectedStatus = i),
          ),
          const SizedBox(height: AppSpacing.xl),
          _DriveTimeSection(hos: hos),
          const SizedBox(height: AppSpacing.xl),
          _WeeklyLogSection(logs: hos.weeklyLogs),
          const SizedBox(height: AppSpacing.xl),
          _ViolationBanner(hasViolation: anyViolation),
          const SizedBox(height: AppSpacing.lg),
          TextButton(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Log edit request submitted')),
            ),
            child: const Text('Request Log Edit / DVIR'),
          ),
        ],
      ),
    );
  }
}

// ── Status toggle ─────────────────────────────────────────────────────────────

class _StatusToggleSection extends StatelessWidget {
  const _StatusToggleSection({required this.selected, required this.onChanged});

  final int selected;
  final ValueChanged<int> onChanged;

  static const List<String> _labels = [
    AppStrings.offDuty,
    AppStrings.sleeper,
    AppStrings.driving,
    AppStrings.onDuty,
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Current Status', style: AppTextStyles.h3),
        const SizedBox(height: AppSpacing.md),
        LayoutBuilder(
          builder: (_, constraints) {
            final buttonWidth = (constraints.maxWidth - 3) / 4;
            return ToggleButtons(
              isSelected: List.generate(4, (i) => i == selected),
              onPressed: onChanged,
              borderRadius: BorderRadius.circular(AppRadius.button),
              selectedColor: AppColors.white,
              fillColor: AppColors.brandPrimary,
              color: AppColors.gray700,
              borderColor: AppColors.gray200,
              selectedBorderColor: AppColors.brandPrimary,
              constraints: BoxConstraints(minWidth: buttonWidth, minHeight: 44),
              children: _labels.map((l) => Text(l, style: AppTextStyles.label)).toList(),
            );
          },
        ),
      ],
    );
  }
}

// ── Today's drive time section ────────────────────────────────────────────────

class _DriveTimeSection extends StatelessWidget {
  const _DriveTimeSection({required this.hos});

  final HosSnapshot hos;

  int get _driveMins  => hos.driveMinutesUsed;
  int get _onDutyMins => hos.onDutyMinutesUsed;
  int get _offDutyMins => hos.offDutyMinutesUsed;

  String _fmt(int mins) {
    final h = mins ~/ 60;
    final m = mins % 60;
    return '${h}h ${m}m';
  }

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
          Text("Today's Drive Time", style: AppTextStyles.h3),
          const SizedBox(height: AppSpacing.md),
          _HosProgressBar(fraction: hos.driveProgressFraction),
          const SizedBox(height: AppSpacing.md),
          _TimeRow(label: 'Driving',   value: _fmt(_driveMins),   borderColor: AppColors.accentBlue),
          _TimeRow(label: 'On Duty',   value: _fmt(_onDutyMins),  borderColor: AppColors.warning),
          _TimeRow(label: 'Off Duty',  value: _fmt(_offDutyMins), borderColor: AppColors.gray300),
        ],
      ),
    );
  }
}

class _HosProgressBar extends StatelessWidget {
  const _HosProgressBar({required this.fraction});

  final double fraction;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: LinearProgressIndicator(
        value: fraction.clamp(0.0, 1.0),
        backgroundColor: AppColors.gray100,
        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
        minHeight: 10,
      ),
    );
  }
}

class _TimeRow extends StatelessWidget {
  const _TimeRow({
    required this.label,
    required this.value,
    required this.borderColor,
  });

  final String label;
  final String value;
  final Color  borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: borderColor, width: 3)),
        color: AppColors.gray50,
        borderRadius: const BorderRadius.only(
          topRight:    Radius.circular(AppRadius.sm),
          bottomRight: Radius.circular(AppRadius.sm),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTextStyles.body),
          Text(value,  style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

// ── 7-day log ─────────────────────────────────────────────────────────────────

class _WeeklyLogSection extends StatelessWidget {
  const _WeeklyLogSection({required this.logs});

  final List<HosDayLog> logs;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('7-Day Log', style: AppTextStyles.h3),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: logs.map((day) => Expanded(child: _DayBox(day: day))).toList(),
        ),
      ],
    );
  }
}

class _DayBox extends StatelessWidget {
  const _DayBox({required this.day});

  final HosDayLog day;

  @override
  Widget build(BuildContext context) {
    final bgColor = day.hasViolation ? AppColors.dangerLight : AppColors.successLight;
    final txColor = day.hasViolation ? AppColors.danger      : AppColors.success;
    final h       = (day.drivingMinutes / 60).toStringAsFixed(1);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 2),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: txColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(DateFormat('EEE').format(day.date),
              style: AppTextStyles.caption.copyWith(color: txColor),
              textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.xs),
          Text(h,
              style: AppTextStyles.label.copyWith(
                  color: txColor, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

// ── Violation banner ──────────────────────────────────────────────────────────

class _ViolationBanner extends StatelessWidget {
  const _ViolationBanner({required this.hasViolation});

  final bool hasViolation;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: hasViolation ? AppColors.dangerLight : AppColors.successLight,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(
          color: hasViolation
              ? AppColors.danger.withValues(alpha: 0.4)
              : AppColors.success.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        children: [
          Icon(
            hasViolation ? Icons.warning_amber_rounded : Icons.check_circle,
            color: hasViolation ? AppColors.danger : AppColors.success,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              hasViolation
                  ? 'Violations detected in the past 7 days'
                  : 'No violations in the past 7 days',
              style: AppTextStyles.body.copyWith(
                color: hasViolation ? AppColors.danger : AppColors.success,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
