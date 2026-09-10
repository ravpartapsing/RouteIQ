// =============================================================================
// FILE: conversations_screen.dart
// PURPOSE: List of dispatcher conversations with unread badges.
//
// NASA RULES applied:
//   Rule 3  — data from MockDataSource; no inline literals.
//   Rule 4  — build() under 60 lines; row extracted to _ConvRow.
//   Rule 10 — const constructor.
// =============================================================================

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/message_model.dart';
import '../../../data/static/mock_data.dart';

class ConversationsScreen extends StatelessWidget {
  const ConversationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final convs = MockDataSource.conversations;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.brandPrimary,
        foregroundColor: AppColors.white,
        elevation: 0,
        title: Text(AppStrings.messages,
            style: AppTextStyles.h3.copyWith(color: AppColors.white)),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        itemCount: convs.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: AppColors.gray100),
        itemBuilder: (context, i) {
          final conv = convs[i];
          return _ConvRow(
            conversation: conv,
            onTap: () => context.go('/messages/${conv.id}'),
          );
        },
      ),
    );
  }
}

// ── Conversation row ──────────────────────────────────────────────────────────

class _ConvRow extends StatelessWidget {
  const _ConvRow({required this.conversation, required this.onTap});

  final ConversationModel conversation;
  final VoidCallback       onTap;

  @override
  Widget build(BuildContext context) {
    final last      = conversation.lastMessage;
    final unread    = conversation.unreadCount;
    final timeLabel = last != null
        ? DateFormat('h:mm a').format(last.timestamp)
        : '';
    return ListTile(
      tileColor: AppColors.white,
      onTap: onTap,
      leading: _AvatarCircle(initials: conversation.dispatcherInitials),
      title: Text(conversation.dispatcherName, style: AppTextStyles.h3),
      subtitle: Text(
        last?.text ?? '',
        style: AppTextStyles.bodySm,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(timeLabel, style: AppTextStyles.caption),
          if (unread > 0) ...[
            const SizedBox(height: AppSpacing.xs),
            _UnreadBadge(count: unread),
          ],
        ],
      ),
    );
  }
}

// ── Avatar circle ─────────────────────────────────────────────────────────────

class _AvatarCircle extends StatelessWidget {
  const _AvatarCircle({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      backgroundColor: AppColors.brandPrimary,
      radius: 22,
      child: Text(
        initials,
        style: AppTextStyles.h3.copyWith(color: AppColors.white),
      ),
    );
  }
}

// ── Unread badge ──────────────────────────────────────────────────────────────

class _UnreadBadge extends StatelessWidget {
  const _UnreadBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: const BoxDecoration(
        color: AppColors.accentBlue,
        borderRadius: BorderRadius.all(Radius.circular(AppRadius.pill)),
      ),
      child: Text(
        '$count',
        style: AppTextStyles.label.copyWith(
          color: AppColors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
