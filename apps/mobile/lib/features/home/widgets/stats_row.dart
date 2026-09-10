import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';

/// Three-column stats row: miles, drive time, stops done.
class StatsRow extends StatelessWidget {
  const StatsRow({
    super.key,
    required this.miles,
    required this.driveTime,
    required this.stops,
  });
  final int    miles;
  final String driveTime;
  final int    stops;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:    const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color:        AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border:       Border.all(color: AppColors.gray200),
      ),
      child: Row(
        children: [
          _Stat(value: '$miles mi',  label: AppStrings.todayMiles),
          _Divider(),
          _Stat(value: driveTime,    label: AppStrings.driveTime),
          _Divider(),
          _Stat(value: '$stops',     label: AppStrings.stopsDone),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: AppTextStyles.h2),
          const SizedBox(height: 2),
          Text(label, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 36, color: AppColors.gray200);
  }
}
