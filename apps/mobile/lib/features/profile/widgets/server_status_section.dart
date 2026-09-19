// =============================================================================
// FILE: server_status_section.dart
// PURPOSE: Settings panel showing which API this build talks to and whether it
//          answers. Lets testers confirm a build is pointed at the right place.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/api/api_client.dart';
import '../../../data/auth/auth_service.dart';

class ServerStatusSection extends StatefulWidget {
  const ServerStatusSection({super.key, this.client});

  final ApiClient? client;

  @override
  State<ServerStatusSection> createState() => _ServerStatusSectionState();
}

class _ServerStatusSectionState extends State<ServerStatusSection> {
  late final ApiClient _api = widget.client ?? ApiClient();
  late Future<ServerStatus> _status = _load();

  // Signed in, /config includes the carrier's own feature overrides.
  Future<ServerStatus> _load() async =>
      _api.status(token: await context.read<AuthService>().accessToken().catchError((_) => null));

  void _retry() => setState(() => _status = _load());

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: AppSpacing.xs, bottom: AppSpacing.sm),
          child: Text('SERVER',
              style: AppTextStyles.label.copyWith(color: AppColors.gray500, letterSpacing: 1.0)),
        ),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
            border: Border.all(color: AppColors.gray200),
          ),
          child: FutureBuilder<ServerStatus>(
            future: _status,
            builder: (context, snap) => _body(snap),
          ),
        ),
      ],
    );
  }

  Widget _body(AsyncSnapshot<ServerStatus> snap) {
    final url = Text(_api.baseUrl, style: AppTextStyles.caption.copyWith(color: AppColors.gray500));
    if (snap.connectionState != ConnectionState.done) {
      return Row(children: [
        const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
        const SizedBox(width: AppSpacing.sm),
        Expanded(child: url),
      ]);
    }
    return switch (snap.data) {
      ServerReachable(:final stage, :final config) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _line(Icons.check_circle, AppColors.success, 'Connected · $stage'),
            url,
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Maps ${config.maps ? "on" : "off"} · '
              'Routing ${config.routing ? "on" : "off"} · '
              'Map matching ${config.mapMatching ? "on" : "off"}',
              style: AppTextStyles.bodySm,
            ),
          ],
        ),
      ServerUnreachable(:final reason) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _line(Icons.error, AppColors.danger, 'Cannot reach server'),
            url,
            Text(reason, style: AppTextStyles.caption.copyWith(color: AppColors.gray500)),
            TextButton(onPressed: _retry, child: const Text('Retry')),
          ],
        ),
      null => _line(Icons.error, AppColors.danger, 'No response'),
    };
  }

  Widget _line(IconData icon, Color color, String text) => Row(children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: AppSpacing.sm),
        Text(text, style: AppTextStyles.body),
      ]);
}
