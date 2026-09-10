// =============================================================================
// FILE: home_screen.dart
// PURPOSE: Main home tab — shows driver greeting, active load, quick actions.
//
// NASA RULE 4 — build() delegates to sub-widgets; stays under 60 lines.
// NASA RULE 3 — all data from MockDataSource, no inline literals.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/static/mock_data.dart';
import '../../../app/routes.dart';
import '../widgets/active_load_card.dart';
import '../widgets/hos_progress_bar.dart';
import '../widgets/quick_actions_row.dart';
import '../widgets/stats_row.dart';
import '../widgets/messages_preview.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final driver = MockDataSource.driver;
    final load   = MockDataSource.activeLoad;
    final hos    = MockDataSource.hosSnapshot;
    final now    = DateTime.now();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // ── App bar / header ─────────────────────────────────────────────
            SliverToBoxAdapter(
              child: _HomeHeader(
                driverName: driver.firstName,
                dateLabel: DateFormat('EEEE, MMM d').format(now),
                hosLabel:  MockDataSource.hosStatusLabel,
                hosProgress: hos.driveProgressFraction,
              ),
            ),

            // ── Content ───────────────────────────────────────────────────────
            SliverPadding(
              padding: const EdgeInsets.all(AppSpacing.screenH),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  ActiveLoadCard(load: load),
                  const SizedBox(height: AppSpacing.lg),
                  QuickActionsRow(onNavigate: () => context.go(AppRoutes.loadDetail.replaceFirst(':id', load.id))),
                  const SizedBox(height: AppSpacing.lg),
                  const StatsRow(
                    miles:     MockDataSource.todayMiles,
                    driveTime: MockDataSource.hosRemainingLabel,
                    stops:     MockDataSource.todayStopsDone,
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  MessagesPreview(
                    conversation: MockDataSource.conversations.first,
                    onTap: () => context.go('/messages/CONV-001'),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Header widget ─────────────────────────────────────────────────────────────

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({
    required this.driverName,
    required this.dateLabel,
    required this.hosLabel,
    required this.hosProgress,
  });

  final String driverName;
  final String dateLabel;
  final String hosLabel;
  final double hosProgress;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenH, AppSpacing.lg, AppSpacing.screenH, AppSpacing.xl),
      decoration: const BoxDecoration(color: AppColors.brandPrimary),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date
          Text(dateLabel,
              style: AppTextStyles.caption.copyWith(color: Colors.white54)),
          const SizedBox(height: AppSpacing.sm),

          // Greeting row
          Row(
            children: [
              // Avatar circle
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color:  AppColors.accentBlue,
                  shape:  BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    MockDataSource.driver.initials,
                    style: const TextStyle(
                      color: AppColors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${AppStrings.goodMorning}, $driverName',
                    style: AppTextStyles.h3.copyWith(color: AppColors.white),
                  ),
                  Text(hosLabel,
                      style: AppTextStyles.caption
                          .copyWith(color: Colors.white60)),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // HOS progress bar
          HosProgressBar(progress: hosProgress),
        ],
      ),
    );
  }
}
