import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_spacing.dart';
import '../../../core/constants/app_strings.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../data/models/message_model.dart';

class MessagesPreview extends StatelessWidget {
  const MessagesPreview({super.key, required this.conversation, required this.onTap});
  final ConversationModel conversation;
  final VoidCallback       onTap;

  @override
  Widget build(BuildContext context) {
    final last = conversation.lastMessage;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(AppStrings.messages, style: AppTextStyles.h3),
        const SizedBox(height: AppSpacing.sm),
        GestureDetector(
          onTap: onTap,
          child: Container(
            padding:    const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color:        AppColors.white,
              borderRadius: BorderRadius.circular(AppRadius.card),
              border:       Border.all(color: AppColors.gray200),
            ),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 44, height: 44,
                  decoration: const BoxDecoration(
                    color: AppColors.brandPrimary,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(conversation.dispatcherInitials,
                        style: const TextStyle(
                            color: AppColors.white, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(conversation.dispatcherName, style: AppTextStyles.body
                          .copyWith(fontWeight: FontWeight.w600)),
                      if (last != null)
                        Text(last.text, style: AppTextStyles.bodySm,
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
                const Text('5m', style: AppTextStyles.caption),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
