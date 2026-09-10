// =============================================================================
// FILE: loads_list_screen.dart
// PURPOSE: Tabbed list of loads — Active, Upcoming, History.
//
// NASA RULES applied:
//   Rule 1  — simple control flow; tab switching via DefaultTabController.
//   Rule 3  — all data from MockDataSource; no inline literals.
//   Rule 4  — build() under 60 lines; tabs extracted to sub-widgets.
//   Rule 10 — const constructors throughout.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/load_model.dart';
import '../../../data/static/mock_data.dart';
import '../widgets/load_card.dart';

class LoadsListScreen extends StatelessWidget {
  const LoadsListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          backgroundColor: AppColors.brandPrimary,
          elevation: 0,
          title: Text(AppStrings.loadsTitle, style: AppTextStyles.h2.copyWith(color: AppColors.white)),
          bottom: const TabBar(
            indicatorColor: AppColors.white,
            labelColor: AppColors.white,
            unselectedLabelColor: AppColors.accentLight,
            tabs: [
              Tab(text: AppStrings.tabActive),
              Tab(text: AppStrings.tabUpcoming),
              Tab(text: AppStrings.tabHistory),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _LoadsTab(loads: [MockDataSource.activeLoad]),
            _LoadsTab(loads: [MockDataSource.upcomingLoad]),
            _LoadsTab(
              loads: MockDataSource.allLoads
                  .where((l) => l.status == LoadStatus.paid)
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Single tab content ────────────────────────────────────────────────────────

class _LoadsTab extends StatelessWidget {
  const _LoadsTab({required this.loads});

  final List<LoadModel> loads;

  @override
  Widget build(BuildContext context) {
    if (loads.isEmpty) {
      return const Center(
        child: Text(AppStrings.noActiveLoad, style: AppTextStyles.body),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.screenH),
      itemCount: loads.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (context, index) {
        final load = loads[index];
        return LoadCard(
          load: load,
          onTap: () => context.go('/loads/${load.id}'),
        );
      },
    );
  }
}
