// =============================================================================
// FILE: chat_screen.dart
// PURPOSE: Chat thread between driver and dispatcher.
//
// NASA RULES applied:
//   Rule 1  — simple linear flow; no complex conditionals in build().
//   Rule 3  — data from MockDataSource; no inline strings.
//   Rule 4  — build() under 60 lines; bubble and input bar extracted.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/message_model.dart';
import '../../../data/static/mock_data.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _ctrl = TextEditingController();

  ConversationModel get _conv => MockDataSource.conversations
      .firstWhere((c) => c.id == widget.conversationId);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _onSend() {
    if (_ctrl.text.trim().isEmpty) return;
    _ctrl.clear();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Message sent')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final conv = _conv;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: _AppBarTitle(conv: conv),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              reverse: true,
              padding: const EdgeInsets.all(AppSpacing.screenH),
              itemCount: conv.messages.length,
              itemBuilder: (_, i) {
                // reverse: true — show newest at bottom, read from end
                final msg = conv.messages[conv.messages.length - 1 - i];
                return _ChatBubble(message: msg);
              },
            ),
          ),
          _InputBar(controller: _ctrl, onSend: _onSend),
        ],
      ),
    );
  }
}

// ── AppBar title with online indicator ───────────────────────────────────────

class _AppBarTitle extends StatelessWidget {
  const _AppBarTitle({required this.conv});

  final ConversationModel conv;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(conv.dispatcherName,
            style: AppTextStyles.h3.copyWith(color: AppColors.white)),
        if (conv.isOnline) ...[
          const SizedBox(width: AppSpacing.sm),
          Container(
            width: 8, height: 8,
            decoration: const BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Text('Online',
              style: AppTextStyles.caption.copyWith(color: AppColors.accentLight)),
        ],
      ],
    );
  }
}

// ── Chat bubble ───────────────────────────────────────────────────────────────

class _ChatBubble extends StatelessWidget {
  const _ChatBubble({required this.message});

  final MessageModel message;

  @override
  Widget build(BuildContext context) {
    final isSent = message.isSent;
    return Align(
      alignment: isSent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.only(
          top: AppSpacing.xs,
          bottom: AppSpacing.xs,
          left: isSent ? 60 : 0,
          right: isSent ? 0 : 60,
        ),
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg, vertical: AppSpacing.md),
        decoration: BoxDecoration(
          color: isSent ? AppColors.accentBlue : AppColors.white,
          borderRadius: BorderRadius.only(
            topLeft:     const Radius.circular(AppRadius.card),
            topRight:    const Radius.circular(AppRadius.card),
            bottomLeft:  Radius.circular(isSent ? AppRadius.card : AppRadius.sm),
            bottomRight: Radius.circular(isSent ? AppRadius.sm : AppRadius.card),
          ),
          border: isSent
              ? null
              : Border.all(color: AppColors.gray200),
        ),
        child: Column(
          crossAxisAlignment:
              isSent ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Text(message.text,
                style: AppTextStyles.body.copyWith(
                  color: isSent ? AppColors.white : AppColors.gray900,
                )),
            const SizedBox(height: AppSpacing.xs),
            Text(
              DateFormat('h:mm a').format(message.timestamp),
              style: AppTextStyles.caption.copyWith(
                color: isSent
                    ? AppColors.white.withValues(alpha: 0.7)
                    : AppColors.gray400,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Input bar ─────────────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  const _InputBar({required this.controller, required this.onSend});

  final TextEditingController controller;
  final VoidCallback          onSend;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(
          AppSpacing.screenH, AppSpacing.sm,
          AppSpacing.sm, AppSpacing.lg),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.gray200)),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                hintStyle: AppTextStyles.body.copyWith(color: AppColors.gray400),
                filled: true,
                fillColor: AppColors.gray50,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg, vertical: AppSpacing.md),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  borderSide: const BorderSide(color: AppColors.gray200),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                  borderSide: const BorderSide(color: AppColors.gray200),
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          IconButton(
            onPressed: onSend,
            icon: const Icon(Icons.send_rounded),
            color: AppColors.brandPrimary,
            style: IconButton.styleFrom(
              backgroundColor: AppColors.accentLight,
              padding: const EdgeInsets.all(AppSpacing.md),
            ),
          ),
        ],
      ),
    );
  }
}
