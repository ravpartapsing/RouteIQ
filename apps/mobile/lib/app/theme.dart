// =============================================================================
// FILE: theme.dart
// PURPOSE: MaterialApp ThemeData — single source of visual config.
//          All widgets inherit from this; nothing is hard-coded in widgets.
//
// NASA RULE 3 — all values const; zero runtime allocation overhead.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_text_styles.dart';
import '../core/constants/app_spacing.dart';

/// Builds the RouteIQ MaterialTheme.
ThemeData buildAppTheme() {
  const colorScheme = ColorScheme(
    brightness:       Brightness.light,
    primary:          AppColors.brandPrimary,
    onPrimary:        AppColors.white,
    secondary:        AppColors.accentBlue,
    onSecondary:      AppColors.white,
    error:            AppColors.danger,
    onError:          AppColors.white,
    surface:          AppColors.white,
    onSurface:        AppColors.gray900,
  );

  return ThemeData(
    useMaterial3:    true,
    colorScheme:     colorScheme,
    scaffoldBackgroundColor: AppColors.background,

    // ── Typography ────────────────────────────────────────────────────────────
    textTheme: const TextTheme(
      displayLarge:  AppTextStyles.display,
      headlineLarge: AppTextStyles.h1,
      headlineMedium: AppTextStyles.h2,
      headlineSmall: AppTextStyles.h3,
      bodyLarge:     AppTextStyles.bodyLg,
      bodyMedium:    AppTextStyles.body,
      bodySmall:     AppTextStyles.bodySm,
      labelSmall:    AppTextStyles.label,
    ),

    // ── AppBar ────────────────────────────────────────────────────────────────
    appBarTheme: const AppBarTheme(
      backgroundColor:    AppColors.brandPrimary,
      foregroundColor:    AppColors.white,
      elevation:          0,
      centerTitle:        true,
      systemOverlayStyle: SystemUiOverlayStyle(
        statusBarColor:           Colors.transparent,
        statusBarIconBrightness:  Brightness.light,
        statusBarBrightness:      Brightness.dark,
      ),
      titleTextStyle: TextStyle(
        fontSize:   17,
        fontWeight: FontWeight.w600,
        color:      AppColors.white,
      ),
    ),

    // ── Elevated button ───────────────────────────────────────────────────────
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor:    AppColors.brandPrimary,
        foregroundColor:    AppColors.white,
        minimumSize:        const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        textStyle: AppTextStyles.buttonLg,
        elevation: 0,
      ),
    ),

    // ── Outlined button ───────────────────────────────────────────────────────
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.brandPrimary,
        minimumSize:     const Size(double.infinity, 52),
        side:            const BorderSide(color: AppColors.brandPrimary, width: 1.5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
        ),
        textStyle: AppTextStyles.buttonLg,
      ),
    ),

    // ── Input fields ─────────────────────────────────────────────────────────
    inputDecorationTheme: InputDecorationTheme(
      filled:          true,
      fillColor:       AppColors.gray50,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide:   const BorderSide(color: AppColors.gray200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide:   const BorderSide(color: AppColors.gray200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide:   const BorderSide(color: AppColors.brandPrimary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.input),
        borderSide:   const BorderSide(color: AppColors.danger),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: AppTextStyles.body.copyWith(color: AppColors.gray400),
    ),

    // ── Cards ─────────────────────────────────────────────────────────────────
    cardTheme: CardThemeData(
      color:     AppColors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.card),
        side: const BorderSide(color: AppColors.gray200, width: 1),
      ),
      margin: EdgeInsets.zero,
    ),

    // ── Divider ───────────────────────────────────────────────────────────────
    dividerTheme: const DividerThemeData(
      color:     AppColors.gray200,
      thickness: 1,
      space:     1,
    ),
  );
}
