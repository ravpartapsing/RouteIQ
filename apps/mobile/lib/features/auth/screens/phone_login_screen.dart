// =============================================================================
// FILE: phone_login_screen.dart
// PURPOSE: Phone number entry screen — sends user to OTP screen.
//          Demo: any 10-digit number is accepted.
//
// NASA RULE 4 — each method < 60 lines.
// NASA RULE 7 — user input is validated before proceeding.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../app/routes.dart';

class PhoneLoginScreen extends StatefulWidget {
  const PhoneLoginScreen({super.key});

  @override
  State<PhoneLoginScreen> createState() => _PhoneLoginScreenState();
}

class _PhoneLoginScreenState extends State<PhoneLoginScreen> {

  final TextEditingController _phoneCtrl = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  // Returns true if phone number has at least 10 digits.
  bool get _isValid =>
      _phoneCtrl.text.replaceAll(RegExp(r'\D'), '').length >= 10;

  void _sendCode() {
    if (!_isValid) return;
    setState(() => _isLoading = true);

    // Simulate network delay (500 ms) — no real API in demo.
    Future.delayed(const Duration(milliseconds: 500), () {
      if (!mounted) return;
      setState(() => _isLoading = false);
      context.go('${AppRoutes.otp}?phone=${Uri.encodeComponent(_phoneCtrl.text)}');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.white,
      appBar: AppBar(
        backgroundColor: AppColors.white,
        foregroundColor: AppColors.gray900,
        elevation: 0,
        title: const Text('Sign In', style: AppTextStyles.h3),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenH),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.xl2),

              // Icon
              Container(
                width: 56, height: 56,
                decoration: const BoxDecoration(
                  color: AppColors.accentLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.phone_android,
                    color: AppColors.brandPrimary, size: 28),
              ),
              const SizedBox(height: AppSpacing.xl),

              Text(AppStrings.enterPhone, style: AppTextStyles.h2),
              const SizedBox(height: AppSpacing.sm),
              Text(
                "We'll send you a verification code",
                style: AppTextStyles.body,
              ),
              const SizedBox(height: AppSpacing.xl3),

              // Phone field
              Row(
                children: [
                  // Country code
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      color:        AppColors.gray50,
                      border:       Border.all(color: AppColors.gray200),
                      borderRadius: BorderRadius.circular(AppRadius.input),
                    ),
                    child: const Row(
                      children: [
                        Text('🇺🇸', style: TextStyle(fontSize: 18)),
                        SizedBox(width: 6),
                        Text('+1', style: AppTextStyles.body),
                      ],
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),

                  // Number input
                  Expanded(
                    child: TextField(
                      controller:  _phoneCtrl,
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      style:       AppTextStyles.body,
                      decoration: const InputDecoration(
                        hintText: AppStrings.phoneHint,
                      ),
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _sendCode(),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl3),

              // Send code button
              AppButton(
                label:      AppStrings.sendCode,
                isLoading:  _isLoading,
                isDisabled: !_isValid,
                onPressed:  _sendCode,
              ),
              const SizedBox(height: AppSpacing.lg),

              // Divider
              Row(children: [
                const Expanded(child: Divider()),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(AppStrings.orContinueEmail,
                      style: AppTextStyles.bodySm),
                ),
                const Expanded(child: Divider()),
              ]),
              const SizedBox(height: AppSpacing.lg),

              // Email login (demo: same OTP flow)
              AppButton(
                label:     AppStrings.continueEmail,
                style:     AppButtonStyle.ghost,
                onPressed: _sendCode,
              ),

              const SizedBox(height: AppSpacing.sm),
              Center(
                child: Text(
                  'Standard message rates may apply.',
                  style: AppTextStyles.caption,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
