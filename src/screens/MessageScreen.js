import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../contexts/AuthContext';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getConversationWithUser,
} from '../services/messaging';
import { markAllUnreadMessageNotificationsForSender } from '../services/notifications';
import { uploadChatAttachmentImage } from '../services/publicProfile';
import OptimizedImage from '../components/OptimizedImage';
import { useNotificationCounts } from '../contexts/NotificationCountsContext';
import { useTheme } from '../contexts/ThemeContext';

const MessageScreen = ({ route, navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshNotificationCounts } = useNotificationCounts();
  const { conversationId, otherUser, userId: otherUserId } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const flatListRef = useRef(null);

  const effectiveConversationId = conversationId || conversation?.id;

  const loadMessages = useCallback(async () => {
    if (!effectiveConversationId || !user?.id) return;

    try {
      setLoading(true);
      const data = await getMessages(effectiveConversationId);
      setMessages(data);

      await markMessagesAsRead(effectiveConversationId, user.id);

      const senderId = otherUser?.id || otherUserId;
      if (senderId) {
        try {
          await markAllUnreadMessageNotificationsForSender(user.id, senderId);
        } catch (e) {
          console.warn('Error marking message notifications read:', e);
        }
      }
      await refreshNotificationCounts();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [
    effectiveConversationId,
    user?.id,
    otherUser?.id,
    otherUserId,
    refreshNotificationCounts,
  ]);

  // If we have otherUserId but no conversationId, create/get conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (otherUserId && !conversationId && user?.id) {
        try {
          const conv = await getConversationWithUser(user.id, otherUserId);
          setConversation(conv);
          // Update route params to include conversationId
          route.params.conversationId = conv.id;
          route.params.otherUser = conv.otherUser;
        } catch (error) {
          console.error('Error initializing conversation:', error);
        }
      }
    };
    initializeConversation();
  }, [otherUserId, conversationId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (effectiveConversationId) {
        loadMessages();
      }
    }, [loadMessages, effectiveConversationId])
  );

  const requestPhotoPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Photo access',
            message: 'Rolls needs access to your photos to attach images in chat.',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage access',
          message: 'Rolls needs access to your storage to attach images.',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('Permission error:', e);
      return false;
    }
  };

  const handleAttachPress = async () => {
    if (sending) return;
    if (Platform.OS === 'android') {
      const ok = await requestPhotoPermission();
      if (!ok) {
        Alert.alert(
          'Permission required',
          'Allow photo access in Settings to attach images.'
        );
        return;
      }
    }
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.85,
        maxWidth: 2048,
        maxHeight: 2048,
        selectionLimit: 1,
        includeBase64: true,
      },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset?.uri) return;
        setPendingAttachment({
          uri: asset.uri,
          base64: asset.base64,
        });
      }
    );
  };

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if ((!trimmed && !pendingAttachment) || sending || !user?.id) return;

    const currentConversationId = conversationId || conversation?.id;
    const recipientId = otherUser?.id || otherUserId;

    if (!currentConversationId || !recipientId) {
      console.error('Missing conversation or recipient info');
      return;
    }

    try {
      setSending(true);
      let imageUrl = null;
      if (pendingAttachment) {
        imageUrl = await uploadChatAttachmentImage(
          user.id,
          pendingAttachment.uri,
          pendingAttachment.base64
        );
      }

      const newMessage = await sendMessage(
        currentConversationId,
        user.id,
        recipientId,
        trimmed,
        imageUrl
      );

      setMessages(prev => [
        ...prev,
        {
          ...newMessage,
          sender: {
            id: user.id,
            username: user.user_metadata?.username,
            display_name: user.user_metadata?.display_name,
          },
        },
      ]);

      setMessageText('');
      setPendingAttachment(null);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Could not send',
        error?.message || 'Something went wrong. Try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.sender_id === user?.id;
    
    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.messageContainerOwn : styles.messageContainerOther,
        ]}
      >
        {!isOwn && item.sender?.avatar_url && (
          <Image
            source={{ uri: item.sender.avatar_url }}
            style={styles.messageAvatar}
            resizeMode="cover"
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          {item.image_url ? (
            <OptimizedImage
              source={{ uri: item.image_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : null}
          {!!(item.message_text && item.message_text.trim()) ? (
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.messageTextOwn : styles.messageTextOther,
                item.image_url && styles.messageTextBelowImage,
              ]}
            >
              {item.message_text}
            </Text>
          ) : null}
          <Text
            style={[
              styles.messageTime,
              isOwn ? styles.messageTimeOwn : styles.messageTimeOther,
            ]}
          >
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const displayUser = otherUser || conversation?.otherUser;
  const displayName = displayUser?.displayName || displayUser?.username || 'User';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        {displayUser?.avatarUrl ? (
          <Image
            source={{ uri: displayUser.avatarUrl }}
            style={styles.headerAvatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </View>
        )}
        <Text style={styles.headerTitle}>{displayName}</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
          />

          {pendingAttachment ? (
            <View style={styles.attachmentPreviewRow}>
              <Image
                source={{ uri: pendingAttachment.uri }}
                style={styles.attachmentThumb}
              />
              <TouchableOpacity
                style={styles.attachmentRemove}
                onPress={() => setPendingAttachment(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={[styles.attachButton, sending && styles.sendButtonDisabled]}
              onPress={handleAttachPress}
              disabled={sending}
              accessibilityLabel="Attach image"
            >
              <Ionicons name="attach-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor={colors.textSecondary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() && !pendingAttachment) || sending
                  ? styles.sendButtonDisabled
                  : null,
              ]}
              onPress={handleSend}
              disabled={(!messageText.trim() && !pendingAttachment) || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <Ionicons name="send" size={20} color={colors.buttonText} />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.navBackground,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
  },
  headerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textWhite,
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  messageContainerOwn: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  messageBubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.inputBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextOwn: {
    color: colors.textWhite,
  },
  messageTextOther: {
    color: colors.textPrimary,
  },
  messageTextBelowImage: {
    marginTop: 8,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    maxWidth: '100%',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: colors.textSecondary,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  attachmentRemove: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    backgroundColor: colors.background,
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});



export default MessageScreen;
