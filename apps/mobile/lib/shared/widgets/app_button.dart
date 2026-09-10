// =============================================================================
// FILE: app_button.dart
// PURPOSE: Reusable button variants used throughout the app.
//          Single widget with a style parameter eliminates code duplication.
//
// NASA RULE 4 — each build() is < 60 lines.
// NASA RULE 3 — all style constants pulled from AppColors/AppTextStyles.
// =============================================================================

import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';

enum AppButtonStyle { primary, secondary, destructive, ghost }

/// Reusable button with configurable style, size, and loading state.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.style      = AppButtonStyle.primary,
    this.isLoading  = false,
    this.isDisabled = false,
    this.icon,
    this.height     = 52.0,
  });

  final String           label;
  final VoidCallback?    onPressed;
  final AppButtonStyle   style;
  final bool             isLoading;
  final bool             isDisabled;
  final IconData?        icon;
  final double           height;

  // Derived state — no logic in build().
  bool get _canPress => !isLoading && !isDisabled && onPressed != null;

  Color get _bgColor => switch (style) {
    AppButtonStyle.primary     => AppColors.brandPrimary,
    AppButtonStyle.secondary   => AppColors.white,
    AppButtonStyle.destructive => AppColors.danger,
    AppButtonStyle.ghost       => Colors.transparent,
  };

  Color get _fgColor => switch (style) {
    AppButtonStyle.primary     => AppColors.white,
    AppButtonStyle.secondary   => AppColors.brandPrimary,
    AppButtonStyle.destructive => AppColors.white,
    AppButtonStyle.ghost       => AppColors.brandPrimary,
  };

  BorderSide get _border => switch (style) {
    AppButtonStyle.secondary => const BorderSide(color: AppColors.brandPrimary, width: 1.5),
    AppButtonStyle.ghost     => const BorderSide(color: AppColors.gray200),
    _                        => BorderSide.none,
  };

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: ElevatedButton(
        onPressed: _canPress ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor:         _canPress ? _bgColor : AppColors.gray200,
          foregroundColor:         _canPress ? _fgColor : AppColors.gray400,
          disabledBackgroundColor: AppColors.gray200,
          disabledForegroundColor: AppColors.gray400,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
            side: _border,
          ),
        ),
        child: _buildContent(),
      ),
    );
  }

  Widget _buildContent() {
    if (isLoading) {
      return const SizedBox(
        width: 22, height: 22,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.white),
      );
    }

    if (icon != null) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: AppSpacing.sm),
          Text(label, style: AppTextStyles.buttonLg),
        ],
      );
    }

    return Text(label, style: AppTextStyles.buttonLg);
  }
}
