import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Image,
  View,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import SignatureScreen from 'react-native-signature-canvas';
import { MessagesParams } from '../../types';

import {
  ToastType,
  useToast,
  Messages as MessagesController,
  useSession,
  useUtils,
  useLanguage,
} from '@components';

import {
  FilterChip,
  Icon,
  ModalCloseButton,
  OBottomPopup,
  OButton,
  ODivider,
  OInput,
  OListRow,
  ONotice,
  OText,
} from '../shared';
import { ChatThread, type ChatMessage } from './ChatThread';
import { useFormats } from '@/hooks/useFormats';
import { describeChange } from './changeEntries';
import { SIGNATURE_PAD_HEIGHT, chatStyles } from './styles';
import { quickMessagesOf } from './quickMessages'
import { isEnded } from '../PreviousMessages/conversation';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';
import {
  themeColor,
  themeControlHeight,
  themeIconSize,
  themeRadius,
  themeVisible,
} from '@/theme/helpers';


/** Normalizes a detected phone string into digits with optional leading + for tel:/sms: URLs */
const sanitizePhoneForDial = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('+')) {
    const restDigits = trimmed.slice(1).replace(/\D/g, '');
    return restDigits ? `+${restDigits}` : null;
  }
  const digitsOnly = trimmed.replace(/\D/g, '');
  return digitsOnly || null;
};

/** Detects the first phone-like sequence inside a message text (7+ digits) */
const detectPhoneInText = (text: string): string | null => {
  const match = text.match(/\+?\d[\d\s().-]{6,}\d/);
  return match ? match[0] : null;
};

/** The largest side, in pixels, of a photo picked for a message (the upload's limit, not a look). */
const PHOTO_MAX_SIDE = 2048;

type ChatProps = MessagesParams & {
  /** Opens the order's details: the ended chat's button. */
  onViewOrder?: () => void
}

/**
 * The chat of an order, laid out as the driver's: the thread (`ChatThread`, `components.chat_bubble`) and, under it, the
 * composer: the signature pad when it is open (`messages.signature`, hidden by default), who receives the message (one row
 * that scrolls sideways: "Send to" and the chips Business for an administrator, Customer, and Driver, off with "No driver yet"
 * until the order has one), the quick messages (`visibility.messages.quick_messages`, only the ones the project has a text
 * for), and the image button (`messages.image_upload`), the field and the round send button (`chat_bubble.slots.send`).
 * Who receives a message decides who can read it, so the chips are never hidden. When the order has ended nothing can be sent: the thread stays readable and the composer is
 * a notice and the "View order" button. The page avoids the keyboard; the composer keeps the system's bottom
 * inset while it is hidden. A message's options (copy its text; call or text its phone) are a sheet of list
 * rows, as every sheet of options, closed by the app's Cancel.
 */
const ChatUI = (props: ChatProps) => {
  const {
    order,
    messages,
    image,
    message,
    sendMessage,
    setMessage,
    canRead,
    setCanRead,
    handleSend,
    setImage,
    onViewOrder
  } = props;

  const [{ user }] = useSession();
  const [{ parseDate }] = useUtils();
  const { date: dateOf, time: timeOf, dateFormat, timeFormat } = useFormats();
  const [, t] = useLanguage();
  const [, { showToast }] = useToast();
  const theme: any = useTheme();
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => chatStyles(theme, bottom), [theme, bottom]);
  const isKeyboardVisible = useKeyboardVisible();
  const [messageList, setMessageList] = useState<any>([])
  const [bottomPopup, setBottomPopup] = useState<
    | { kind: 'idle' }
    | { kind: 'message'; copyText: string; phoneRaw: string | null; phoneSanitized: string | null }
  >({ kind: 'idle' });
  const chatDisabled = isEnded(order)

  const showQuickMessages = themeVisible(theme, 'messages.quick_messages')
  const showImageUpload = themeVisible(theme, 'messages.image_upload')
  const showSignature = themeVisible(theme, 'messages.signature')
  const showTime = themeVisible(theme, 'messages.time')
  const showSentTo = themeVisible(theme, 'messages.sent_to')
  // The order's own messages (it was placed, its status changed).
  const showConsole = themeVisible(theme, 'messages.order_console')

  const handleClickQuickMessage = (text: string) => {
    setMessage && setMessage(`${message}${text}`)
  }

  const [formattedMessages, setFormattedMessages] = useState<Array<ChatMessage>>([]);
  const [isShowSignaturePad, setIsShowSignaturePad] = useState(false)
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  const onChangeMessage = (val: string) => {
    setMessage && setMessage(val);
  };

  const removeImage = () => {
    setImage && setImage(null);
    setImagePreviewUri(null);
  };

  const handleImagePicker = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxHeight: PHOTO_MAX_SIDE,
        maxWidth: PHOTO_MAX_SIDE,
        includeBase64: true,
        quality: 1
      },
      (response: any) => {
        const image = response.assets?.[0];
        if (!image) return
        if (image.didCancel) {
          console.log('User cancelled image picker');
        } else if (image.errorMessage) {
          console.log('ImagePicker Error: ', image.errorMessage);
          showToast(ToastType.Error, image.errorMessage);
        } else {
          if (image.uri) {
            const url = `data:${image.type};base64,${image.base64}`;
            setImage && setImage(url);
            setImagePreviewUri(image.uri);
          } else {
            showToast(ToastType.Error, t('IMAGE_NOT_FOUND', 'Image not found'));
          }
        }
      },
    );
  };

  // Who can be written to: an administrator needs one of the store's side besides the always-on administrator;
  // a business owner can only switch the customer or the driver off (never both), and with no driver nothing.
  const handleFilter = (value: any, reader: string) => {
    const isAdmin = user?.level === 0;
    const readersCount = [
      ...new Map<string, boolean>(Object.entries(canRead)).values(),
    ].filter((read: boolean) => read).length;
    const minReaders = isAdmin ? 2 : order?.driver ? 3 : 4;

    if (minReaders === 4) {
      return;
    }

    if (readersCount > minReaders || value[reader]) {
      setCanRead({ ...canRead, ...value });
    } else if (reader !== 'business' && isAdmin) {
      setCanRead({ ...canRead, ...value, business: true });
    } else if (reader !== 'customer') {
      setCanRead({ ...canRead, ...value, customer: true });
    } else {
      setCanRead({ ...canRead, ...value, driver: true });
    }
  };

  const onSubmit = () => {
    handleSend && handleSend();
    setImage && setImage(null);
    setImagePreviewUri(null);
    setMessage && setMessage('');
    setIsShowSignaturePad(false)
  };

  /** What a change of the order says in the thread (`changeEntries.ts`): undefined, and the entry left out, when it has nothing to say. */
  const messageConsole = (message: any): string | undefined => describeChange(message, t)

  const userRoles: any = {
    0: t('ADMINISTRATOR', 'Administrator'),
    1: t('CITY_MANAGER', 'City manager'),
    2: t('BUSINESS_OWNER', 'Business owner'),
    3: t('CUSTOMER', 'Customer'),
    4: t('DRIVER', 'Driver'),
    5: t('DRIVER_MANAGER', 'Driver manager'),
  };

  // The role of each reader a message can have, as the chips and the line under a message write it.
  const businessLabel = t('BUSINESS', 'Business')
  const customerLabel = t('CUSTOMER', 'Customer')
  const driverLabel = t('DRIVER', 'Driver')

  /** Who can read a message: written under it. */
  const recipientsOf = (canSee: any): string[] => [
    canSee?.includes('2') && user?.level !== 2 && businessLabel,
    canSee?.includes('3') && customerLabel,
    canSee?.includes('4') && driverLabel,
  ].filter(Boolean) as string[]

  // The quick messages of the user's level that the project has a text for (`quickMessagesOf`).
  const quickMessages = quickMessagesOf(user?.level, t)
  const quickMessageTexts = quickMessages.map(quickMessage => quickMessage.text).join('|')
  useEffect(() => {
    setMessageList(quickMessages)
  }, [user?.level, quickMessageTexts])

  // A message is written once: its formatted entry is kept by what it is built from, so an update of the list (a new
  // message, a refetch) builds only what is new and hands the thread the same objects for the rest (its rows are memoized
  // on them). What the entry also reads (who I am, the words, the date formats) is the cache's key: when one changes, the
  // cache starts again.
  const entries = useRef<{ key: string, byMessage: Map<string, ChatMessage> }>({ key: '', byMessage: new Map() })

  useEffect(() => {
    if (messages?.loading || !order?.id) return

    const sentToLabel = `${t('SENT_TO', 'Sent to')}:`
    // The words of the statuses follow the language, which the three role labels and "Sent to" carry here.
    const environment = [user?.id, user?.level, order.id, dateFormat, timeFormat, showTime, businessLabel, customerLabel, driverLabel, sentToLabel].join('|')
    if (entries.current.key !== environment) entries.current = { key: environment, byMessage: new Map() }
    const cache = entries.current.byMessage
    const seen = new Set<string>()
    /** The entry of `signature`: the kept one, or the one `build` writes now. */
    const entryOf = (signature: string, build: () => ChatMessage | undefined): ChatMessage | undefined => {
      seen.add(signature)
      if (cache.has(signature)) return cache.get(signature)
      const built = build()
      if (built) cache.set(signature, built)
      return built
    }

    // The date and the time of a message, as the project writes them.
    const written = (createdAt: string) => ({
      createdAt,
      day: dateOf(createdAt, { utc: false }),
      time: timeOf(createdAt, { utc: false }),
    })

    const newMessages: Array<ChatMessage> = []
    // "Order placed · 12:29 PM", and the app it came through when the order says one.
    const buildFirstMessage = (): ChatMessage => {
      const placedAt = written(parseDate(order?.created_at, { outputFormat: 'YYYY-MM-DD HH:mm:ss' }))
      return {
        _id: 0,
        type: 0,
        system: true,
        placed: [
          t('ORDER_PLACED_AT', 'Order placed'),
          showTime && placedAt.time,
          order?.app_id && `${t('VIA', 'Via')} ${t(String(order.app_id).toUpperCase(), String(order.app_id))}`,
        ].filter(Boolean).join(' · '),
        ...placedAt,
      }
    };
    (messages?.messages || []).forEach((message: any) => {
      let newMessage: ChatMessage | undefined;
      const messageOrderId = message?.order_id ?? message?.order?.id
      const canSee = message?.can_see
      if (
        parseInt(String(messageOrderId), 10) === order?.id &&
        message.type !== 0 &&
        (canSee?.includes?.('2') || canSee?.includes?.('0') || canSee?.includes?.(2) || canSee?.includes?.(0))
      ) {
        // What the entry is built from: a changed message (its text, its picture, who reads it, the change) is another entry.
        const change = message.change
        const signature = [message.id, message.created_at, message.type, message.comment, message.source, String(canSee), message.author?.id, message.author?.name, message.author?.level, change?.attribute, String(change?.old), String(change?.new), message.driver?.name, message.driver?.lastname].join('\u0001')
        newMessage = entryOf(signature, () => {
          const isConsole = message.type === 1
          const isMine = message.author?.id === user?.id
          const entry: ChatMessage = {
            _id: message.id,
            text: isConsole ? messageConsole(message) : message.comment,
            ...written(parseDate(message?.created_at, { outputFormat: 'YYYY-MM-DD HH:mm:ss' })),
            image: message.source,
            type: message.type,
            system: isConsole,
            sender: isConsole || isMine ? null : `${message.author?.name} (${userRoles[message.author?.level]})`,
            sentToLabel,
            sentTo: isConsole ? [] : recipientsOf(canSee),
            user: { _id: message.author?.id },
          }
          // A change the app has no words for leaves no entry: never a raw code, an empty bubble or "undefined".
          return isConsole && !entry.text ? undefined : entry
        })
      }
      if (message.type === 0) {
        newMessage = entryOf(['placed', order?.created_at, order?.app_id, showTime, sentToLabel].join('\u0001'), buildFirstMessage)
      }
      if (newMessage) newMessages.push(newMessage)
    })
    // What is no longer in the list leaves the cache.
    cache.forEach((_entry, signature) => { if (!seen.has(signature)) cache.delete(signature) })
    let _arrayMessages = newMessages.reverse()

    if (!showConsole) {
      _arrayMessages = _arrayMessages.filter(msg => msg.type !== 1 && msg.type !== 0)
    }
    setFormattedMessages(_arrayMessages);
  }, [
    messages?.messages, messages?.loading, order?.id, order?.created_at, order?.app_id, user?.id, user?.level, showConsole, showTime,
    businessLabel, customerLabel, driverLabel, dateFormat, timeFormat
  ]);

  // No driver on the order: nobody to write to there. With one, the driver receives the message unless switched off.
  // The controller starts with every reader on (`canRead`: administrator, business, customer, driver); the mockup's chat
  // starts with the customer only, so the Business chip (the administrator's) starts off the first time the chat opens.
  // The store's own level never sees that chip and always reads its own messages, so it stays on for it.
  const startedRecipients = useRef(false)
  useEffect(() => {
    const next = { ...canRead, driver: !!order?.driver }
    if (!startedRecipients.current && user?.level !== 2 && canRead?.customer !== false) next.business = false
    startedRecipients.current = true
    setCanRead(next);
  }, [order?.driver]);

  const handleCloseBottomPopup = () => setBottomPopup({ kind: 'idle' });

  /** A long press on a bubble (its first phone, if it has one), or a tap on a phone of its text. */
  const handleMessageOptions = (currentMessage: ChatMessage, phone?: string) => {
    if (!currentMessage?.text) return;
    const text = String(currentMessage.text);
    const detected = phone ?? detectPhoneInText(text);
    setBottomPopup({
      kind: 'message',
      copyText: text,
      phoneRaw: detected,
      phoneSanitized: detected ? sanitizePhoneForDial(detected) : null,
    });
  };

  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
      margin: 0px;
    }
    body,html {
      height: ${SIGNATURE_PAD_HEIGHT}px;
      border-radius: ${themeRadius(theme, 'md')}px;
    }
  `;

  const signatureRef = useRef<any>(null);

  const handleClear = () => {
    setImage && setImage(null);
    signatureRef.current.clearSignature();
  };

  const handleEnd = () => {
    signatureRef.current.readSignature();
  };

  const handleOK = (signature: any) => {
    setImage && setImage(signature);
  };

  const isSendDisabled = sendMessage?.loading || (message === '' && !image) || messages?.loading
  const sendSlot = theme.native.components.chat_bubble.slots.send
  const recipientSlot = theme.native.components.chat_bubble.slots.recipient
  const hasPreview = !!imagePreviewUri && !isShowSignaturePad
  // The small "remove" mark keeps a touch target of the control's height.
  const removeSlop = (themeControlHeight(theme, 'md') - themeIconSize(theme, 'sm')) / 2
  const hasDriver = !!order?.driver

  const renderSignaturePad = () => (
    <View style={styles.signature} testID='chat-signature'>
      <SignatureScreen
        ref={signatureRef}
        onOK={handleOK}
        webStyle={signatureStyle}
        backgroundColor={themeColor(theme, 'surface_alt')}
        onEnd={handleEnd}
      />
      <View style={styles.clearSignature}>
        <ModalCloseButton onPress={handleClear} accessibilityLabel={t('CLEAR', 'Clear')} />
      </View>
    </View>
  )

  // Who receives the message, inside the composer (the driver's): "Send to" and a chip for each reader in one row that scrolls
  // sideways. It decides the message's readers, so it is never hidden. The Business chip is for an administrator; the Driver
  // chip is always there, off and with its note ("Driver · No driver yet", in the chip, which a row that scrolls cannot lose) until
  // the order has one. A mark in every chip (a circle that is ticked while its reader receives the message) so a chip keeps its size.
  const renderRecipients = () => {
    const recipients = [
      user?.level !== 2 && { key: 'business', text: businessLabel, disabled: false },
      { key: 'customer', text: customerLabel, disabled: false },
      { key: 'driver', text: hasDriver ? driverLabel : `${driverLabel} · ${t('NO_DRIVER_YET', 'No driver yet')}`, disabled: !hasDriver },
    ].filter(Boolean) as Array<{ key: 'business' | 'customer' | 'driver', text: string, disabled: boolean }>
    return (
      <ScrollView
        style={styles.row}
        contentContainerStyle={styles.recipients}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        horizontal
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps='handled'
        testID='chat-recipients'
      >
        <OText preset='body_sm' color='text_muted'>{t('SEND_TO', 'Send to')}</OText>
        {recipients.map(({ key, text, disabled }) => {
          const selected = !disabled && !!canRead?.[key]
          return (
            <FilterChip
              key={key}
              text={text}
              size={recipientSlot.size}
              icon={selected ? 'checkmark-circle' : 'ellipse-outline'}
              selected={selected}
              disabled={disabled}
              onPress={() => handleFilter({ [key]: !canRead?.[key] }, key)}
              testID={`chat-recipient-${key}`}
            />
          )
        })}
      </ScrollView>
    )
  }

  const renderQuickMessages = () => (
    <ScrollView
      style={styles.row}
      contentContainerStyle={styles.quickMessages}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
      testID='chat-quick-messages'
    >
      {messageList.map((quickMessage: any) => (
        <FilterChip
          key={quickMessage.key}
          text={quickMessage.text}
          size={recipientSlot.size}
          onPress={() => handleClickQuickMessage((message?.length ?? 0) > 0 ? ' ' + quickMessage.text : quickMessage.text)}
        />
      ))}
    </ScrollView>
  )

  // The buttons before the field: the signature pad and the image.
  const renderFieldActions = () => (
    <>
      {showSignature && (
        <OButton
          iconOnly
          color='neutral'
          appearance='ghost'
          size='md'
          accessibilityLabel={t('SIGNATURE', 'Signature')}
          icon={<Icon set='mci' name='signature-freehand' />}
          onClick={() => {
            setImage && setImage(null);
            setImagePreviewUri(null);
            setIsShowSignaturePad(!isShowSignaturePad);
          }}
        />
      )}
      {showImageUpload && (
        <View>
          <OButton
            iconOnly
            color='neutral'
            appearance='ghost'
            size='md'
            accessibilityLabel={t('ATTACH_PHOTO', 'Attach photo')}
            icon={hasPreview
              ? <Image source={{ uri: imagePreviewUri as string }} style={styles.preview} resizeMode='cover' />
              : <Icon name='image-outline' />}
            onClick={handleImagePicker}
          />
          {hasPreview && (
            <Pressable
              style={({ pressed }) => [styles.removeImage, pressed && styles.pressed]}
              onPress={() => removeImage()}
              hitSlop={removeSlop}
              accessibilityRole='button'
              accessibilityLabel={t('REMOVE', 'Remove')}
            >
              <Icon name='close-circle' size='sm' />
            </Pressable>
          )}
        </View>
      )}
    </>
  )

  // What the footer holds, under the line: the composer while the order is open (who receives the message, the quick messages,
  // then the buttons, the field and the send button); once it has ended, the notice and the way to the order.
  const renderFooter = () => (
    <>
      <ODivider />
      <View
        style={[styles.toolbar, isKeyboardVisible ? styles.toolbarKeyboard : styles.toolbarInset]}
        testID='chat-composer'
      >
        {chatDisabled ? (
          <>
            <ONotice variant='info' testID='chat-ended-notice'>
              {t('ORDER_ENDED_NO_MESSAGES', 'This order has ended, so you can\'t send new messages.')}
            </ONotice>
            {!!onViewOrder && (
              <OButton
                text={t('VIEW_ORDER', 'View order')}
                color='neutral'
                appearance='outline'
                size='md'
                onClick={onViewOrder}
                testID='chat-view-order'
              />
            )}
          </>
        ) : (
          <>
            {showSignature && isShowSignaturePad && renderSignaturePad()}
            {renderRecipients()}
            {showQuickMessages && messageList.length > 0 && renderQuickMessages()}
            <View style={styles.primary} testID='chat-composer-row'>
              {renderFieldActions()}
              <View style={styles.field}>
                <OInput
                  testID='chat-input'
                  value={message}
                  isValueSync
                  onChange={onChangeMessage}
                  onSubmitEditing={onSubmit}
                  returnKeyType={message ? 'send' : 'done'}
                  blurOnSubmit
                  autoCorrect={false}
                  autoCompleteType='off'
                  inline
                  accessibilityLabel={t('WRITE_A_MESSAGE', 'Write a message')}
                  placeholder={t('WRITE_A_MESSAGE', 'Write a message')}
                />
              </View>
              <OButton
                iconOnly
                round={sendSlot.shape === 'round'}
                color={sendSlot.color}
                appearance={sendSlot.appearance}
                size={sendSlot.size}
                accessibilityLabel={t('SEND_MESSAGE', 'Send message')}
                icon={<Icon name='send' size='md' />}
                onClick={onSubmit}
                disabled={isSendDisabled}
                testID='chat-send'
              />
            </View>
          </>
        )}
      </View>
    </>
  )

  // What a message offers: each row does its action and closes the sheet.
  const messageOptions = bottomPopup.kind !== 'message' ? [] : [
    {
      key: 'copy',
      title: t('COPY_MESSAGE_TEXT', 'Copy text'),
      icon: 'copy-outline',
      onPress: () => {
        Clipboard.setString(bottomPopup.copyText);
        showToast && showToast(ToastType.Success, t('COPIED', 'Copied'));
      },
    },
    ...(bottomPopup.phoneSanitized ? [
      {
        key: 'call',
        title: t('CALL', 'Call'),
        icon: 'call',
        onPress: () => { Linking.openURL(`tel:${bottomPopup.phoneSanitized}`).catch(() => {}) },
      },
      {
        key: 'text',
        title: t('TEXT', 'Text'),
        icon: 'chatbubble-ellipses-outline',
        onPress: () => { Linking.openURL(`sms:${bottomPopup.phoneSanitized}`).catch(() => {}) },
      },
    ] : []),
  ]

  return (
    <View style={styles.wrapper}>
      <ChatThread
        messages={formattedMessages}
        userId={user?.id}
        loading={messages?.loading}
        showTime={showTime}
        showSentTo={showSentTo}
        onOptions={handleMessageOptions}
        closeLabel={t('CLOSE', 'Close')}
        scrollToBottomLabel={t('SCROLL_TO_BOTTOM', 'Scroll to the last message')}
        footer={renderFooter()}
      />
      <OBottomPopup
        open={bottomPopup.kind !== 'idle'}
        onClose={handleCloseBottomPopup}
        title={bottomPopup.kind === 'message' && bottomPopup.phoneRaw ? bottomPopup.phoneRaw : t('MESSAGE_OPTIONS', 'Message options')}
        padded
      >
        {bottomPopup.kind === 'message' && (
          <View style={styles.sheet} testID='chat-options'>
            {messageOptions.map((option, index) => (
              <OListRow
                key={option.key}
                testID={`chat-option-${option.key}`}
                title={option.title}
                icon={option.icon}
                chevron={false}
                last={index === messageOptions.length - 1}
                onPress={() => {
                  option.onPress();
                  handleCloseBottomPopup();
                }}
              />
            ))}
            <OButton
              text={t('CANCEL', 'Cancel')}
              color='neutral'
              appearance='outline'
              onClick={handleCloseBottomPopup}
            />
          </View>
        )}
      </OBottomPopup>
    </View>
  );
};

export const Chat = (props: ChatProps) => {
  const MessagesProps = {
    ...props,
    UIComponent: ChatUI,
  };
  return <MessagesController {...MessagesProps} />;
};
