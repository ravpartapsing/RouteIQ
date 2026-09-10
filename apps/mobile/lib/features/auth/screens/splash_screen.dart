// =============================================================================
// FILE: splash_screen.dart
// PURPOSE: App entry point — shows branding and transitions to login.
//
// NASA RULE 4 — initState is simple; no complex async chains.
// NASA RULE 1 — single timer, predictable flow.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../app/routes.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {

  late final AnimationController _controller;
  late final Animation<double>   _fadeAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync:    this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeAnim = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _controller.forward();

    // Navigate after 2.5 s — bounded, no unbounded loop (NASA Rule 1).
    Future.delayed(const Duration(milliseconds: 2500), _navigateNext);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _navigateNext() {
    if (!mounted) return;
    context.go(AppRoutes.phoneLogin);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.brandPrimary,
      body: FadeTransition(
        opacity: _fadeAnim,
        child: const _SplashContent(),
      ),
    );
  }
}

/// Stateless content — extracted to keep build() minimal.
class _SplashContent extends StatelessWidget {
  const _SplashContent();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Truck icon in circle
          Container(
            width: 100, height: 100,
            decoration: BoxDecoration(
              shape:  BoxShape.circle,
              border: Border.all(color: Colors.white30, width: 2),
            ),
            child: const Icon(
              Icons.local_shipping_rounded,
              size:  52,
              color: AppColors.white,
            ),
          ),
          const SizedBox(height: 24),

          // App name
          const Text(
            AppStrings.appName,
            style: TextStyle(
              fontSize:   32,
              fontWeight: FontWeight.w700,
              color:      AppColors.white,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 8),

          // Tagline
          Text(
            AppStrings.appTagline,
            style: TextStyle(
              fontSize: 14,
              color:    AppColors.white.withValues(alpha: 0.65),
            ),
          ),
          const SizedBox(height: 60),

          // Loading dots
          _LoadingDots(),
        ],
      ),
    );
  }
}

/// Animated loading dots indicator.
class _LoadingDots extends StatefulWidget {
  @override
  State<_LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<_LoadingDots>
    with SingleTickerProviderStateMixin {

  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync:    this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, __) {
        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (i) {
            final delay  = i / 3.0;
            final value  = ((_ctrl.value - delay) % 1.0).clamp(0.0, 1.0);
            final opacity = value < 0.5 ? value * 2 : (1 - value) * 2;
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 3),
              width:  8, height: 8,
              decoration: BoxDecoration(
                color:  AppColors.white.withValues(alpha: opacity.clamp(0.2, 1.0)),
                shape: BoxShape.circle,
              ),
            );
          }),
        );
      },
    );
  }
}
