// =============================================================================
// FILE: otp_screen.dart
// PURPOSE: 6-box OTP entry — auto-submits on completion.
//          Demo: any 6-digit code is accepted.
//
// NASA RULE 4 — methods < 60 lines.
// NASA RULE 1 — fixed-length loop (exactly 6 boxes).
// =============================================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../app/routes.dart';

class OtpScreen extends StatefulWidget {
  const OtpScreen({super.key, required this.phoneNumber});
  final String phoneNumber;

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {

  // Exactly 6 controllers — fixed bound (NASA Rule 1).
  static const int _boxCount = 6;
  final List<TextEditingController> _controllers =
      List.generate(_boxCount, (_) => TextEditingController());
  final List<FocusNode> _focusNodes =
      List.generate(_boxCount, (_) => FocusNode());

  bool _isLoading  = false;
  int  _resendSecs = 45;

  @override
  void initState() {
    super.initState();
    _startResendTimer();
  }

  @override
  void dispose() {
    for (final c in _controllers) c.dispose();
    for (final f in _focusNodes)  f.dispose();
    super.dispose();
  }

  void _startResendTimer() {
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      if (_resendSecs <= 0) return false;
      setState(() => _resendSecs--);
      return true;
    });
  }

  /// Called when a digit is entered into box [index].
  void _onDigitEntered(String value, int index) {
    if (value.isEmpty) {
      // On backspace, move focus left.
      if (index > 0) _focusNodes[index - 1].requestFocus();
      return;
    }
    if (index < _boxCount - 1) {
      _focusNodes[index + 1].requestFocus();
    }
    // Auto-submit when all boxes are filled.
    final code = _controllers.map((c) => c.text).join();
    if (code.length == _boxCount) _verify();
  }

  void _verify() {
    final code = _controllers.map((c) => c.text).join();
    if (code.length < _boxCount) return;
    setState(() => _isLoading = true);

    // Demo: accept any code after 600 ms delay.
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      context.go(AppRoutes.home);
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
        title: const Text('Verify', style: TextStyle(
          fontSize: 17, fontWeight: FontWeight.w600, color: AppColors.gray900)),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.screenH),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: AppSpacing.xl3),

              Container(
                width: 64, height: 64,
                decoration: const BoxDecoration(
                  color: AppColors.accentLight,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.message_outlined,
                    color: AppColors.brandPrimary, size: 30),
              ),
              const SizedBox(height: AppSpacing.xl),

              Text('Check your messages', style: AppTextStyles.h2),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'We sent a 6-digit code to ${widget.phoneNumber}',
                style: AppTextStyles.body,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.xl3),

              // 6 OTP boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: List.generate(
                  _boxCount,
                  (i) => _OtpBox(
                    controller: _controllers[i],
                    focusNode:  _focusNodes[i],
                    onChanged:  (v) => _onDigitEntered(v, i),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl3),

              AppButton(
                label:     'Verify Code',
                isLoading: _isLoading,
                onPressed: _verify,
              ),
              const SizedBox(height: AppSpacing.xl),

              Text("Didn't get the code?", style: AppTextStyles.bodySm),
              const SizedBox(height: 4),
              _resendSecs > 0
                  ? Text('Resend in 0:${_resendSecs.toString().padLeft(2, '0')}',
                      style: AppTextStyles.bodySm)
                  : TextButton(
                      onPressed: () => setState(() => _resendSecs = 45),
                      child: const Text('Resend Code'),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A single OTP digit input box.
class _OtpBox extends StatelessWidget {
  const _OtpBox({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
  });

  final TextEditingController controller;
  final FocusNode             focusNode;
  final ValueChanged<String>  onChanged;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 46, height: 56,
      child: TextField(
        controller:      controller,
        focusNode:       focusNode,
        keyboardType:    TextInputType.number,
        textAlign:       TextAlign.center,
        maxLength:       1,
        style:           AppTextStyles.h2,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        decoration: InputDecoration(
          counterText: '',
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.input),
            borderSide: const BorderSide(color: AppColors.gray300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppRadius.input),
            borderSide: const BorderSide(color: AppColors.brandPrimary, width: 2),
          ),
          filled:     true,
          fillColor:  AppColors.white,
        ),
        onChanged: onChanged,
      ),
    );
  }
}
