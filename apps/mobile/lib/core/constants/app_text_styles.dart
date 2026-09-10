// =============================================================================
// FILE: app_text_styles.dart
// PURPOSE: All typography constants — size, weight, letter spacing.
//          Maps 1-to-1 to the Figma design system typography scale.
//
// NASA RULE 3 — all values are compile-time const; zero runtime allocation.
// =============================================================================

import 'package:flutter/material.dart';
import 'app_colors.dart';

abstract final class AppTextStyles {
  // ---------------------------------------------------------------------------
  // Display
  // ---------------------------------------------------------------------------
  static const TextStyle display = TextStyle(
    fontSize: 30,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
    color: AppColors.gray900,
    height: 1.2,
  );

  // ---------------------------------------------------------------------------
  // Headings
  // ---------------------------------------------------------------------------
  static const TextStyle h1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    color: AppColors.gray900,
    height: 1.3,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: AppColors.gray900,
    height: 1.3,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    color: AppColors.gray900,
    height: 1.4,
  );

  // ---------------------------------------------------------------------------
  // Body
  // ---------------------------------------------------------------------------
  static const TextStyle bodyLg = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: AppColors.gray700,
    height: 1.5,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.gray700,
    height: 1.5,
  );

  static const TextStyle bodySm = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: AppColors.gray500,
    height: 1.4,
  );

  // ---------------------------------------------------------------------------
  // Caption / Label
  // ---------------------------------------------------------------------------
  static const TextStyle caption = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.gray500,
    letterSpacing: 0.2,
    height: 1.4,
  );

  static const TextStyle label = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.gray500,
    letterSpacing: 0.5,
    height: 1.3,
  );

  // ---------------------------------------------------------------------------
  // Button text
  // ---------------------------------------------------------------------------
  static const TextStyle buttonLg = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
  );

  static const TextStyle buttonMd = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.2,
  );
}
