// =============================================================================
// FILE: profile_screen.dart
// PURPOSE: Driver profile — header, stats, navigation tile list.
//
// NASA RULES applied:
//   Rule 3  — data from MockDataSource.driver; navigation via AppRoutes.
//   Rule 4  — build() under 60 lines; header, stats, tiles extracted.
//   Rule 10 — const constructors where possible.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/routes.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/driver_model.dart';
import 'package:provider/provider.dart';
import '../../../data/auth/auth_service.dart';
import '../../../data/static/mock_data.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driver = MockDataSource.driver;
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _ProfileHeader(driver: MockDataSource.driver)),
          SliverToBoxAdapter(
            child: _StatsRow(
              onTime:  driver.onTimePercent,
              loads:   driver.totalLoads,
              miles:   driver.totalMilesDriven,
              safety:  driver.safetyScore,
            ),
          ),
          const SliverToBoxAdapter(child: _NavTiles()),
        ],
      ),
    );
  }
}

// ── Blue profile header ───────────────────────────────────────────────────────

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.driver});

  final DriverModel driver;

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthService>().me;
    return Container(
      color: AppColors.brandPrimary,
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenH,
        MediaQuery.of(context).padding.top + AppSpacing.xl,
        AppSpacing.screenH,
        AppSpacing.xl2,
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 34,
            backgroundColor: AppColors.white.withValues(alpha: 0.2),
            child: Text(
              me?.initials ?? MockDataSource.driver.initials,
              style: AppTextStyles.h1.copyWith(color: AppColors.white),
            ),
          ),
          const SizedBox(width: AppSpacing.lg),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(me?.fullName ?? MockDataSource.driver.fullName,
                  style: AppTextStyles.h2.copyWith(color: AppColors.white)),
              const SizedBox(height: AppSpacing.xs),
              Text(
                me != null
                    ? '${me.driverCode}  ·  ${me.carrierName}'
                    : '${MockDataSource.driver.cdlClass}  ·  ${MockDataSource.driver.driverType}',
                style: AppTextStyles.bodySm.copyWith(color: AppColors.accentLight),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── 4-column stats row ────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({
    required this.onTime,
    required this.loads,
    required this.miles,
    required this.safety,
  });

  final double onTime;
  final int    loads;
  final int    miles;
  final double safety;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      child: Row(
        children: [
          _StatCell(value: '${onTime.toStringAsFixed(0)}%', label: 'On Time'),
          _StatCell(value: '$loads', label: 'Loads'),
          _StatCell(value: '${(miles / 1000).toStringAsFixed(0)}k', label: 'Miles'),
          _StatCell(value: '${safety.toStringAsFixed(0)}', label: 'Safety'),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: AppTextStyles.h2.copyWith(color: AppColors.brandPrimary)),
          const SizedBox(height: AppSpacing.xs),
          Text(label, style: AppTextStyles.caption),
        ],
      ),
    );
  }
}

// ── Navigation tiles ──────────────────────────────────────────────────────────

class _NavTiles extends StatelessWidget {
  const _NavTiles();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(AppSpacing.screenH),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: AppColors.gray200),
      ),
      child: Column(
        children: [
          _Tile(
            icon: Icons.schedule,
            title: AppStrings.hosTitle,
            subtitle: 'Duty status & 7-day log',
            onTap: () => context.go(AppRoutes.hosLog),
          ),
          _Tile(
            icon: Icons.payments_outlined,
            title: AppStrings.settlements,
            subtitle: 'Pay stubs & earnings',
            onTap: () => context.go(AppRoutes.settlements),
          ),
          _Tile(
            icon: Icons.folder_outlined,
            title: AppStrings.myDocuments,
            subtitle: 'CDL, BOL, POD, insurance',
            onTap: () => context.go(AppRoutes.documents),
          ),
          _Tile(
            icon: Icons.bar_chart_outlined,
            title: AppStrings.performance,
            subtitle: 'Safety score & on-time rate',
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Performance coming soon')),
            ),
          ),
          _Tile(
            icon: Icons.receipt_long_outlined,
            title: AppStrings.expenses,
            subtitle: 'Fuel, tolls, miscellaneous',
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Expense tracking coming soon')),
            ),
          ),
          _Tile(
            icon: Icons.settings_outlined,
            title: AppStrings.settingsTitle,
            subtitle: 'Notifications, GPS, appearance',
            onTap: () => context.go(AppRoutes.settings),
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.showDivider = true,
  });

  final IconData   icon;
  final String     title;
  final String     subtitle;
  final VoidCallback onTap;
  final bool       showDivider;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ListTile(
          leading: Icon(icon, color: AppColors.brandPrimary),
          title: Text(title, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: AppTextStyles.caption),
          trailing: const Icon(Icons.chevron_right, color: AppColors.gray400),
          onTap: onTap,
        ),
        if (showDivider)
          const Divider(height: 1, indent: 56, color: AppColors.gray100),
      ],
    );
  }
}
