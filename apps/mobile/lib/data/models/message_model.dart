// =============================================================================
// FILE: message_model.dart
// PURPOSE: Immutable value objects for dispatcher ↔ driver messaging.
//
// NASA RULE 3 — all fields final.
// =============================================================================

/// Whether a message was sent by the driver or received from dispatch.
enum MessageDirection { sent, received }

/// A single chat message in a conversation thread.
final class MessageModel {
  const MessageModel({
    required this.id,
    required this.text,
    required this.direction,
    required this.timestamp,
    this.isRead = true,
  });

  final String           id;
  final String           text;
  final MessageDirection direction;
  final DateTime         timestamp;
  final bool             isRead;

  /// Whether this message was sent by the driver.
  bool get isSent => direction == MessageDirection.sent;
}

/// A conversation thread between the driver and one dispatcher.
final class ConversationModel {
  const ConversationModel({
    required this.id,
    required this.dispatcherName,
    required this.dispatcherInitials,
    required this.messages,
    this.isOnline = false,
  });

  final String             id;
  final String             dispatcherName;
  final String             dispatcherInitials;
  final List<MessageModel> messages;
  final bool               isOnline;

  /// The most recent message in the thread.
  MessageModel? get lastMessage =>
      messages.isNotEmpty ? messages.last : null;

  /// Count of unread messages.
  int get unreadCount =>
      messages.where((m) => !m.isRead && !m.isSent).length;
}
