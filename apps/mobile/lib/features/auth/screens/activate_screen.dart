// =============================================================================
// FILE: activate_screen.dart
// PURPOSE: Driver sign-in. Three things from the dispatcher — carrier code,
//          driver code, one-time activation code — bind this phone to the
//          driver. There is no password to forget.
// =============================================================================

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../app/routes.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/api/api_client.dart';
import '../../../data/auth/auth_service.dart';
import '../../../shared/widgets/app_button.dart';

class ActivateScreen extends StatefulWidget {
  const ActivateScreen({super.key});

  @override
  State<ActivateScreen> createState() => _ActivateScreenState();
}

class _ActivateScreenState extends State<ActivateScreen> {
  final _carrier = TextEditingController();
  final _driver = TextEditingController();
  final _code = TextEditingController();
  bool _busy = false;
  String? _error;
  Map<String, String> _fields = const {};

  @override
  void dispose() {
    _carrier.dispose();
    _driver.dispose();
    _code.dispose();
    super.dispose();
  }

  bool get _complete =>
      _carrier.text.trim().length >= 3 &&
      _driver.text.trim().isNotEmpty &&
      _code.text.replaceAll(RegExp(r'[\s-]'), '').length == 8;

  Future<void> _submit() async {
    if (!_complete || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _fields = const {};
    });
    try {
      await context.read<AuthService>().activate(
            carrierCode: _carrier.text,
            driverCode: _driver.text,
            code: _code.text,
          );
      if (mounted) context.go(AppRoutes.home);
    } on ApiException catch (e) {
      setState(() {
        _error = e.fields.isEmpty ? e.message : null;
        _fields = e.fields;
      });
    } on SocketException {
      setState(() => _error = 'No connection. Check your signal and try again.');
    } on Exception {
      setState(() => _error = 'Could not reach RouteIQ. Try again in a moment.');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _field({
    required String label,
    required TextEditingController controller,
    required String hint,
    String? error,
    List<TextInputFormatter> formatters = const [],
    TextInputAction action = TextInputAction.next,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: AppTextStyles.label.copyWith(color: AppColors.gray700)),
          const SizedBox(height: AppSpacing.xs),
          TextField(
            controller: controller,
            textCapitalization: TextCapitalization.characters,
            autocorrect: false,
            enableSuggestions: false,
            textInputAction: action,
            inputFormatters: formatters,
            style: AppTextStyles.bodyLg,
            decoration: InputDecoration(hintText: hint, errorText: error),
            onChanged: (_) => setState(() {}),
            onSubmitted: (_) => action == TextInputAction.done ? _submit() : null,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.gray900,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('Sign In', style: AppTextStyles.h3),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenH),
          children: [
            const SizedBox(height: AppSpacing.lg),
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(color: AppColors.accentLight, shape: BoxShape.circle),
              child: const Icon(Icons.badge_outlined, color: AppColors.brandPrimary, size: 28),
            ),
            const SizedBox(height: AppSpacing.xl),
            const Text('Connect this phone', style: AppTextStyles.h2),
            const SizedBox(height: AppSpacing.sm),
            const Text(
              'Your dispatcher gives you these three codes. You only do this once on this phone.',
              style: AppTextStyles.body,
            ),
            const SizedBox(height: AppSpacing.xl2),
            if (_error != null)
              Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.dangerLight,
                  borderRadius: BorderRadius.circular(AppRadius.input),
                ),
                child: Text(_error!, style: AppTextStyles.body.copyWith(color: AppColors.danger)),
              ),
            _field(
              label: 'Carrier code',
              controller: _carrier,
              hint: 'e.g. acme-freight',
              error: _fields['carrierCode'],
              formatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9-]'))],
            ),
            _field(
              label: 'Driver code',
              controller: _driver,
              hint: 'e.g. D-0001',
              error: _fields['driverCode'],
              formatters: [FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9-]'))],
            ),
            _field(
              label: 'Activation code',
              controller: _code,
              hint: 'XXXX-XXXX',
              error: _fields['code'],
              action: TextInputAction.done,
              formatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[a-zA-Z0-9-]')),
                LengthLimitingTextInputFormatter(9),
              ],
            ),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Sign In',
              isLoading: _busy,
              isDisabled: !_complete,
              onPressed: _submit,
            ),
            const SizedBox(height: AppSpacing.lg),
            const Center(
              child: Text(
                'Lost your code or got a new phone? Ask your dispatcher for a new one.',
                style: AppTextStyles.caption,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
