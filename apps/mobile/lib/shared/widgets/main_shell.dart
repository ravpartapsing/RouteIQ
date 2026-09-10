// =============================================================================
// FILE: main_shell.dart
// PURPOSE: Bottom navigation shell — persists across all main screens.
//
// NASA RULE 4 — functions < 60 lines.
// NASA RULE 3 — tab config is compile-time const.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_text_styles.dart';
import '../../app/routes.dart';

/// Defines a single tab entry in the bottom navigation bar.
final class _TabItem {
  const _TabItem({
    required this.path,
    required this.label,
    required this.icon,
    required this.activeIcon,
  });
  final String    path;
  final String    label;
  final IconData  icon;
  final IconData  activeIcon;
}

// All 5 tab definitions — compile-time const.
const List<_TabItem> _tabs = [
  _TabItem(path: AppRoutes.home,          label: 'Home',    icon: Icons.home_outlined,         activeIcon: Icons.home),
  _TabItem(path: AppRoutes.loads,         label: 'Loads',   icon: Icons.local_shipping_outlined,activeIcon: Icons.local_shipping),
  _TabItem(path: AppRoutes.documents,     label: 'Docs',    icon: Icons.folder_outlined,        activeIcon: Icons.folder),
  _TabItem(path: AppRoutes.conversations, label: 'Msgs',    icon: Icons.chat_bubble_outline,    activeIcon: Icons.chat_bubble),
  _TabItem(path: AppRoutes.profile,       label: 'Profile', icon: Icons.person_outline,         activeIcon: Icons.person),
];

/// Shell widget that wraps all main screens with the bottom tab bar.
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});

  final Widget child;

  /// Returns the index of the currently selected tab based on route location.
  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    for (int i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final selectedIndex = _currentIndex(context);

    return Scaffold(
      body: child,
      bottomNavigationBar: _BottomBar(
        selectedIndex: selectedIndex,
        onTap: (index) => context.go(_tabs[index].path),
      ),
    );
  }
}

/// Stateless bottom navigation bar widget.
class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.selectedIndex,
    required this.onTap,
  });

  final int                selectedIndex;
  final ValueChanged<int>  onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.gray200)),
      ),
      child: SafeArea(
        child: SizedBox(
          height: 60,
          child: Row(
            children: List.generate(_tabs.length, (i) => _buildTab(i)),
          ),
        ),
      ),
    );
  }

  Widget _buildTab(int index) {
    final tab    = _tabs[index];
    final active = index == selectedIndex;

    return Expanded(
      child: GestureDetector(
        onTap: () => onTap(index),
        behavior: HitTestBehavior.opaque,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              active ? tab.activeIcon : tab.icon,
              size:  24,
              color: active ? AppColors.accentBlue : AppColors.gray400,
            ),
            const SizedBox(height: 3),
            Text(
              tab.label,
              style: AppTextStyles.label.copyWith(
                color:      active ? AppColors.accentBlue : AppColors.gray400,
                fontWeight: active ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            if (active)
              Container(
                margin: const EdgeInsets.only(top: 3),
                width:  4, height: 4,
                decoration: const BoxDecoration(
                  color: AppColors.accentBlue,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
