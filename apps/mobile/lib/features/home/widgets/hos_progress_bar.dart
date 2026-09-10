// =============================================================================
// FILE: hos_progress_bar.dart
// PURPOSE: Horizontal HOS drive-time progress bar with colour coding.
// =============================================================================

import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';

/// Displays HOS remaining as a colour-coded horizontal bar.
/// [progress] is 0.0 (empty) to 1.0 (limit reached).
class HosProgressBar extends StatelessWidget {
  const HosProgressBar({super.key, required this.progress});
  final double progress;

  Color get _barColor {
    if (progress >= 0.85) return AppColors.danger;
    if (progress >= 0.70) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(4),
      child: LinearProgressIndicator(
        value:            progress.clamp(0.0, 1.0),
        minHeight:        6,
        backgroundColor:  Colors.white24,
        valueColor:       AlwaysStoppedAnimation<Color>(_barColor),
      ),
    );
  }
}
