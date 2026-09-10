// =============================================================================
// FILE: app_spacing.dart
// PURPOSE: Spacing and border-radius constants — 8pt grid system.
//
// NASA RULE 3 — compile-time const, zero runtime cost.
// =============================================================================

abstract final class AppSpacing {
  // 8pt grid
  static const double xs   = 4.0;
  static const double sm   = 8.0;
  static const double md   = 12.0;
  static const double lg   = 16.0;
  static const double xl   = 20.0;
  static const double xl2  = 24.0;
  static const double xl3  = 32.0;
  static const double xl4  = 40.0;
  static const double xl5  = 48.0;

  // Screen horizontal padding
  static const double screenH = 20.0;
}

abstract final class AppRadius {
  static const double badge   =  4.0;
  static const double sm      =  6.0;
  static const double card    = 12.0;
  static const double input   = 12.0;
  static const double button  = 14.0;
  static const double cardLg  = 16.0;
  static const double sheet   = 20.0;
  static const double pill    = 999.0;
}
