// =============================================================================
// FILE: settings_screen.dart
// PURPOSE: App settings — notifications, GPS, appearance, support.
//
// NASA RULES applied:
//   Rule 1  — simple boolean state map; no nested conditionals.
//   Rule 3  — section data defined as const records; no magic strings.
//   Rule 4  — build() under 60 lines; each section is a sub-widget.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../data/auth/auth_service.dart';
import '../../../app/routes.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../widgets/server_status_section.dart';

typedef _SwitchEntry = ({String key, String title, bool defaultOn});

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  // Switch values keyed by unique string id
  late final Map<String, bool> _switches = {
    'notif_load':     true,
    'notif_msg':      false,
    'notif_pay':      false,
    'notif_cdl':      false,
    'gps_share':      true,
    'gps_bg':         false,
    'gps_history':    false,
    'app_dark':       true,
    'app_system':     false,
  };

  void _toggle(String key) => setState(() => _switches[key] = !_switches[key]!);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(AppStrings.settingsTitle,
            style: AppTextStyles.h3.copyWith(color: AppColors.white)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.screenH),
        children: [
          _SwitchSection(
            header: 'NOTIFICATIONS',
            items: const [
              (key: 'notif_load', title: 'New load assigned',     defaultOn: true),
              (key: 'notif_msg',  title: 'Dispatch messages',     defaultOn: false),
              (key: 'notif_pay',  title: 'Payment received',      defaultOn: false),
              (key: 'notif_cdl',  title: 'CDL expiry alerts',     defaultOn: false),
            ],
            switches: _switches,
            onToggle: _toggle,
          ),
          const SizedBox(height: AppSpacing.lg),
          _SwitchSection(
            header: 'GPS & PRIVACY',
            items: const [
              (key: 'gps_share',   title: 'Share location with dispatch', defaultOn: true),
              (key: 'gps_bg',      title: 'Background location',          defaultOn: false),
              (key: 'gps_history', title: 'Location history',             defaultOn: false),
            ],
            switches: _switches,
            onToggle: _toggle,
          ),
          const SizedBox(height: AppSpacing.lg),
          _SwitchSection(
            header: 'APPEARANCE',
            items: const [
              (key: 'app_dark',   title: 'Dark Mode',        defaultOn: true),
              (key: 'app_system', title: 'Use system theme', defaultOn: false),
            ],
            switches: _switches,
            onToggle: _toggle,
          ),
          const SizedBox(height: AppSpacing.lg),
          const ServerStatusSection(),
          const SizedBox(height: AppSpacing.lg),
          const _SupportSection(),
        ],
      ),
    );
  }
}

// ── Switch section ────────────────────────────────────────────────────────────

class _SwitchSection extends StatelessWidget {
  const _SwitchSection({
    required this.header,
    required this.items,
    required this.switches,
    required this.onToggle,
  });

  final String                 header;
  final List<_SwitchEntry>     items;
  final Map<String, bool>      switches;
  final ValueChanged<String>   onToggle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: AppSpacing.xs, bottom: AppSpacing.sm),
          child: Text(header,
              style: AppTextStyles.label.copyWith(
                color: AppColors.gray500,
                letterSpacing: 1.0,
              )),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.gray200),
          ),
          child: Column(
            children: items.asMap().entries.map((e) {
              final item = e.value;
              final isLast = e.key == items.length - 1;
              return Column(
                children: [
                  SwitchListTile.adaptive(
                    title: Text(item.title, style: AppTextStyles.body),
                    value: switches[item.key] ?? item.defaultOn,
                    onChanged: (_) => onToggle(item.key),
                    activeThumbColor: AppColors.brandPrimary,
                    activeTrackColor: AppColors.accentLight,
                  ),
                  if (!isLast)
                    const Divider(height: 1, indent: 16, color: AppColors.gray100),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

// ── Support section ───────────────────────────────────────────────────────────

class _SupportSection extends StatelessWidget {
  const _SupportSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: AppSpacing.xs, bottom: AppSpacing.sm),
          child: Text('SUPPORT',
              style: AppTextStyles.label.copyWith(
                color: AppColors.gray500,
                letterSpacing: 1.0,
              )),
        ),
        Container(
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.gray200),
          ),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.help_outline, color: AppColors.brandPrimary),
                title: const Text('Help Center', style: AppTextStyles.body),
                trailing: const Icon(Icons.chevron_right, color: AppColors.gray400),
                onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Opening Help Center...')),
                ),
              ),
              const Divider(height: 1, indent: 56, color: AppColors.gray100),
              ListTile(
                leading: const Icon(Icons.logout, color: AppColors.danger),
                title: Text('Log Out',
                    style: AppTextStyles.body.copyWith(color: AppColors.danger)),
                onTap: () async {
                  await context.read<AuthService>().logout();
                  if (context.mounted) context.go(AppRoutes.activate);
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
