// =============================================================================
// FILE: app_colors.dart
// PURPOSE: Single source of truth for all colour tokens used in RouteIQ Driver.
//
// NASA RULE 3 — restrict data scope: all values are private-final or public-
// const so they cannot be mutated at runtime.
// =============================================================================

import 'package:flutter/material.dart';

/// All colour constants for the RouteIQ brand.
/// Every widget in the app MUST use these tokens; no hard-coded hex values.
abstract final class AppColors {
  // ---------------------------------------------------------------------------
  // Brand palette (matches Figma design system — #304E9E primary)
  // ---------------------------------------------------------------------------
  static const Color brandPrimary   = Color(0xFF304E9E);
  static const Color brandDark      = Color(0xFF253D7F);
  static const Color brandDeep      = Color(0xFF1E3380);
  static const Color accentBlue     = Color(0xFF0057FF);
  static const Color accentLight    = Color(0xFFEFF6FF);

  // ---------------------------------------------------------------------------
  // Semantic colours
  // ---------------------------------------------------------------------------
  static const Color success        = Color(0xFF16A34A);
  static const Color successLight   = Color(0xFFF0FDF4);
  static const Color warning        = Color(0xFFD97706);
  static const Color warningLight   = Color(0xFFFFFBEB);
  static const Color danger         = Color(0xFFDC2626);
  static const Color dangerLight    = Color(0xFFFEF2F2);
  static const Color info           = Color(0xFF2563EB);
  static const Color infoLight      = Color(0xFFEFF6FF);

  // ---------------------------------------------------------------------------
  // Neutral / gray scale
  // ---------------------------------------------------------------------------
  static const Color white          = Color(0xFFFFFFFF);
  static const Color gray50         = Color(0xFFF9FAFB);
  static const Color gray100        = Color(0xFFF3F4F6);
  static const Color gray200        = Color(0xFFE5E7EB);
  static const Color gray300        = Color(0xFFD1D5DB);
  static const Color gray400        = Color(0xFF9CA3AF);
  static const Color gray500        = Color(0xFF6B7280);
  static const Color gray700        = Color(0xFF374151);
  static const Color gray900        = Color(0xFF111827);

  // ---------------------------------------------------------------------------
  // Background / surface
  // ---------------------------------------------------------------------------
  static const Color background     = Color(0xFFF0F4FF);
  static const Color surface        = Color(0xFFFFFFFF);
  static const Color surfaceCard    = Color(0xFFFFFFFF);

  // ---------------------------------------------------------------------------
  // Status badge colours (load statuses)
  // ---------------------------------------------------------------------------
  static const Color statusInTransit  = Color(0xFF2563EB);
  static const Color statusDelivered  = Color(0xFF16A34A);
  static const Color statusAssigned   = Color(0xFFD97706);
  static const Color statusDispatched = Color(0xFF7C3AED);
  static const Color statusDraft      = Color(0xFF6B7280);
}
