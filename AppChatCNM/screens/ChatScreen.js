import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Linking,KeyboardAvoidingView,SafeAreaView,Platform, } from "react-native";
import { GiftedChat, Bubble, Send } from "react-native-gifted-chat";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import EmojiSelector from "react-native-emoji-selector";
import Lightbox from "react-native-lightbox";
import { uploadFile, getMessages, pinMessage, recallMessage as recallMessageApi, deleteMessageForUser } from "../services/apiServices";
import { useFocusEffect } from "@react-navigation/native";
import io from "socket.io-client";

// Component chính cho màn hình chat
export default function ChatScreen({ navigation, route }) {
  // --- Khởi tạo state và ref ---
  const [messages, setMessages] = useState([]); // Danh sách tin nhắn
  const [preview, setPreview] = useState(null); // Xem trước media (ảnh, video, file)
  const [text, setText] = useState(""); // Nội dung tin nhắn đang nhập
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Hiển thị bảng chọn emoji
  const [selectedMessage, setSelectedMessage] = useState(null); // Tin nhắn được chọn khi nhấn giữ
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false); // Hiển thị modal tùy chọn tin nhắn
  const [pinnedMessage, setPinnedMessage] = useState(null); // Tin nhắn được ghim
  const [replyingMessage, setReplyingMessage] = useState(null); // Tin nhắn đang trả lời
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // ID tin nhắn được làm nổi bật
  const [scrollCompleted, setScrollCompleted] = useState(false); // Trạng thái cuộn hoàn tất
  const flatListRef = useRef(null); // Ref cho danh sách tin nhắn
  const giftedChatRef = useRef(null); // Ref cho GiftedChat
  const socket = useRef(null); // Ref cho socket.io
  const { conversation, currentUser, otherUser } = route.params; // Thông tin cuộc trò chuyện, người dùng hiện tại và đối phương

  // --- Kết nối và xử lý socket ---
  useEffect(() => {
    // Khởi tạo socket và kết nối tới server
    socket.current = io("http://192.168.100.60:8004", { transports: ["websocket"] });
    socket.current.on("connect", () => {
      console.log("Socket connected: ", socket.current.id);
      socket.current.emit("markAsSeen", { conversationId: conversation._id, userId: currentUser._id });
    });

    // Lắng nghe tin nhắn mới
    socket.current.on(`receiveMessage-${conversation._id}`, (newMessage) => {
      const formattedMessage = {
        _id: newMessage._id,
        text: newMessage.text || "",
        createdAt: new Date(newMessage.createdAt),
        user: {
          _id: newMessage.sender._id,
          name: newMessage.sender.username,
          avatar: newMessage.sender.avatar,
        },
        image: newMessage.imageUrl || undefined,
        video: newMessage.videoUrl || undefined,
        file: newMessage.fileUrl || undefined,
        fileName: newMessage.fileName || undefined,
        isRecalled: newMessage.isRecalled || false,
        replyTo: newMessage.replyTo || null,
      };
      setMessages((prevMessages) => {
        if (prevMessages.find((msg) => msg._id === formattedMessage._id)) {
          return prevMessages;
        }
        return GiftedChat.append(prevMessages, [formattedMessage]);
      });
    });

    // Lắng nghe sự kiện tin nhắn được xem
    socket.current.on(`messageSeen-${conversation._id}`, (data) => {
      const { messageId, userId, seenAt } = data;
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId
            ? { ...msg, seenBy: [...(msg.seenBy || []), { user: userId, seenAt: new Date(seenAt) }] }
            : msg
        )
      );
    });

    // Lắng nghe sự kiện tin nhắn được cập nhật (thu hồi)
    socket.current.on("messageUpdated", (data) => {
      if (data.conversationId === conversation._id && data.messageId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === data.messageId
              ? { ...msg, text: "Tin nhắn đã bị thu hồi", image: null, video: null, file: null, isRecalled: true }
              : msg
          )
        );
      } else if (data.conversationId === conversation._id) {
        fetchMessages();
      }
    });

    // Ngắt kết nối socket khi component unmount
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [conversation._id]);

  // Đánh dấu tin nhắn là đã xem khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      messages.forEach((msg) => {
        if (msg.user._id !== currentUser._id && !msg.seenBy?.some((s) => s.user === currentUser._id)) {
          socket.current.emit("messageSeen", { messageId: msg._id, userId: currentUser._id });
        }
      });
    }, [messages, currentUser._id])
  );

  // --- Lấy danh sách tin nhắn từ server ---
  const fetchMessages = async () => {
    try {
      const data = await getMessages(conversation._id);
      const formattedMessages = data.map((msg) => ({
        _id: msg._id,
        text: msg.isRecalled ? "Tin nhắn đã bị thu hồi" : msg.text || "",
        createdAt: new Date(msg.createdAt),
        user: {
          _id: msg.senderId._id,
          name: msg.senderId.username,
          avatar: msg.senderId.avatar,
        },
        image: msg.imageUrl || undefined,
        video: msg.videoUrl || undefined,
        file: msg.fileUrl || undefined,
        fileName: msg.fileName || undefined,
        seenBy: msg.seenBy || [],
        isPinned: msg.isPinned || false,
        isRecalled: msg.isRecalled || false,
        deletedFrom: msg.deletedFrom || [],
        replyTo: msg.replyTo || null,
      }));

      const filteredMessages = formattedMessages.filter(
        (msg) => !msg.deletedFrom?.includes(currentUser._id)
      );
      const pinned = formattedMessages.find((msg) => msg.isPinned);
      setPinnedMessage(pinned || null);
      setMessages(filteredMessages.reverse());
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      alert("Failed to fetch messages. Please try again.");
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [conversation._id]);

  // --- Gửi tin nhắn ---
  const onSend = useCallback(
    async (newMessages = []) => {
      const message = newMessages[0];
      let messageType = "text";
      if (message.image) messageType = "image";
      else if (message.video) messageType = "video";
      else if (message.file) messageType = "file";

      const messageData = {
        conversationId: conversation._id,
        senderId: currentUser._id,
        messageType: messageType,
        text: message.text || "",
        imageUrl: message.image || "",
        videoUrl: message.video || "",
        fileUrl: message.file || "",
        fileName: message.fileName || message.file?.split("/").pop() || "",
        iconCode: "",
        replyTo: replyingMessage ? replyingMessage._id : null,
      };

      try {
        socket.current.emit("sendMessage", messageData);
        setReplyingMessage(null);
      } catch (error) {
        console.error("Error sending message:", error);
        alert("Failed to send message. Please try again.");
      }

      setText("");
      setPreview(null);
    },
    [conversation._id, currentUser._id, replyingMessage]
  );

  // --- Xử lý media (ảnh, video, file) ---
  // Chọn ảnh từ thư viện
  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Cần cấp quyền truy cập thư viện để chọn ảnh!");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setPreview({ type: "image", uri: imageUri });
        sendMediaMessage(imageUri, "image");
      }
    } catch (error) {
      console.error("Error in handleImagePick:", error);
      alert("Lỗi khi chọn ảnh: " + error.message);
    }
  };

  // Chọn video từ thư viện
  const handleVideoPick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert("Cần cấp quyền truy cập thư viện để chọn video!");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        base64: false,
      });

      if (!result.canceled) {
        const videoUri = result.assets[0].uri;
        setPreview({ type: "video", uri: videoUri });
        sendMediaMessage(videoUri, "video");
      }
    } catch (error) {
      console.error("Error in handleVideoPick:", error);
      alert("Lỗi khi chọn video: " + error.message);
    }
  };

  // Chọn file từ thiết bị
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled) return;

      let uri, name;
      if (result.assets && result.assets.length > 0) {
        uri = result.assets[0].uri;
        name = result.assets[0].name || uri.split("/").pop();
      } else {
        uri = result.uri;
        name = result.name || uri.split("/").pop();
      }

      setPreview({ type: "file", uri, name });
      sendMediaMessage(uri, "file", name);
    } catch (error) {
      console.error("Error picking document:", error);
      alert("Lỗi khi chọn tài liệu: " + error.message);
    }
  };

  // Gửi media (ảnh, video, file) lên server
  const sendMediaMessage = async (uri, type, fileName = "") => {
    try {
      if (!uri) throw new Error("URI không hợp lệ");

      let file;
      if (uri.startsWith("data:")) {
        const response = await fetch(uri);
        const blob = await response.blob();
        file = {
          uri: uri,
          name: fileName || `${type}_${Date.now()}.jpg`,
          type: type === "image" ? "image/jpeg" : type === "video" ? "video/mp4" : "application/octet-stream",
          blob: blob,
        };
      } else {
        const extension = uri.split(".").pop()?.toLowerCase();
        const supportedImageExtensions = ["png", "jpeg", "jpg"];
        const supportedVideoExtensions = ["mp4", "mov"];

        const fileType =
          type === "image" && supportedImageExtensions.includes(extension)
            ? extension === "png"
              ? "image/png"
              : "image/jpeg"
            : type === "video" && supportedVideoExtensions.includes(extension)
            ? extension === "mov"
              ? "video/quicktime"
              : "video/mp4"
            : type === "image"
            ? "image/jpeg"
            : type === "video"
            ? "video/mp4"
            : extension === "pdf"
            ? "application/pdf"
            : extension === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : extension === "doc"
            ? "application/msword"
            : "application/octet-stream";

        file = {
          uri: uri,
          name: fileName || `${type}_${Date.now()}.${extension || (type === "image" ? "jpg" : "mp4")}`,
          type: fileType,
        };
      }

      const responseData = await uploadFile(file, conversation._id, currentUser._id);
      if (responseData && responseData.success) {
        const uploadedFileUrl = responseData.imageUrl || responseData.videoUrl || responseData.fileUrl;
        if (uploadedFileUrl) {
          const newMessage = {
            _id: Math.random().toString(36).substring(7),
            createdAt: new Date(),
            user: {
              _id: currentUser._id,
              name: currentUser.username,
              avatar: currentUser.avatar,
            },
            [type]: uploadedFileUrl,
            text: type === "file" ? `📄 ${fileName || file.name}` : "",
            fileName: type === "file" ? fileName || file.name : undefined,
            replyTo: replyingMessage
              ? { _id: replyingMessage._id, user: replyingMessage.user, text: replyingMessage.text }
              : null,
          };
          onSend([newMessage]);
          setReplyingMessage(null);
          setPreview(null);
        } else {
          alert("Lỗi: URL tải lên không hợp lệ.");
        }
      } else {
        alert(responseData?.message || "Lỗi khi tải lên file.");
      }
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn media:", error);
      alert("Không thể gửi tin nhắn: " + error.message);
    }
  };

  // --- Render các loại tin nhắn (ảnh, video, file) ---
  // Hiển thị tin nhắn ảnh
  const renderMessageImage = (props) => (
    <Lightbox activeProps={{ resizeMode: "contain" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Image
          source={{ uri: props.currentMessage.image }}
          style={{ width: 200, height: 200, borderRadius: 10 }}
          resizeMode="cover"
        />
      </View>
    </Lightbox>
  );

  // Hiển thị tin nhắn video
  const renderMessageVideo = (props) => (
    <View style={{ padding: 10 }}>
      <Video
        source={{ uri: props.currentMessage.video }}
        style={{ width: 150, height: 100 }}
        useNativeControls
        resizeMode="contain"
      />
    </View>
  );

  // Hiển thị tin nhắn file
  const renderMessageFile = (props) => {
    const { currentMessage } = props;
    const fileName = currentMessage.fileName || currentMessage.text?.replace("📄 ", "") || "Tệp không xác định";
    const fileUrl = currentMessage.file;
    const extension = fileName.split(".").pop()?.toLowerCase();
    const fileTypeLabel =
      extension === "pdf"
        ? "PDF"
        : extension === "doc" || extension === "docx"
        ? "Word Document"
        : extension === "txt"
        ? "Text File"
        : "File";
    const fileIcon =
      extension === "pdf"
        ? "file-pdf"
        : extension === "doc" || extension === "docx"
        ? "file-word"
        : "insert-drive-file";

    const handleDownload = async () => {
      if (!fileUrl) {
        alert("Không tìm thấy link tải xuống cho file này.");
        return;
      }
      try {
        await Linking.openURL(fileUrl);
      } catch (error) {
        console.error("Lỗi khi mở link tải xuống:", error);
        alert("Không thể mở link tải xuống. Vui lòng thử lại sau.");
      }
    };

    return (
      <View style={styles.fileContainer}>
        <View style={styles.fileInfo}>
          <MaterialIcons name={fileIcon} size={28} color="#7B61FF" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
              {fileName}
            </Text>
            <Text style={styles.fileType}>{fileTypeLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDownload} style={styles.downloadButton}>
          <MaterialIcons name="file-download" size={20} color="#fff" />
          <Text style={styles.downloadText}>Tải xuống</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // --- Xử lý tin nhắn (ghim, thu hồi, trả lời, xóa) ---
  // Ghim tin nhắn
  const handlePinMessage = async () => {
    if (selectedMessage) {
      try {
        await pinMessage(selectedMessage._id, { isPinned: true });
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === selectedMessage._id ? { ...msg, isPinned: true } : msg
          )
        );
        setPinnedMessage(selectedMessage);
        setIsMessageModalVisible(false);
      } catch (error) {
        console.error("Lỗi khi ghim tin nhắn:", error);
        alert("Đã xảy ra lỗi khi ghim tin nhắn. Vui lòng thử lại.");
      }
    }
  };

  // Bỏ ghim tin nhắn
  const handleUnpinMessage = async (messageId) => {
    try {
      await pinMessage(messageId, { isPinned: false });
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId ? { ...msg, isPinned: false } : msg
        )
      );
      setPinnedMessage(null);
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(null);
      }
    } catch (error) {
      console.error("Lỗi khi bỏ ghim tin nhắn:", error);
      alert("Đã xảy ra lỗi khi bỏ ghim tin nhắn. Vui lòng thử lại.");
    }
  };

  // Thu hồi tin nhắn
  const handleRecall = async () => {
    if (selectedMessage) {
      try {
        await recallMessageApi(selectedMessage._id, conversation._id);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === selectedMessage._id
              ? { ...msg, text: "Tin nhắn đã bị thu hồi", image: null, video: null, file: null, isRecalled: true }
              : msg
          )
        );
        setIsMessageModalVisible(false);
        if (socket.current && conversation._id && selectedMessage._id) {
          socket.current.emit("messageUpdated", {
            conversationId: conversation._id,
            messageId: selectedMessage._id,
          });
        }
      } catch (error) {
        console.error("Lỗi khi thu hồi tin nhắn:", error);
        alert("Đã xảy ra lỗi khi thu hồi tin nhắn. Vui lòng thử lại.");
      }
    }
  };

  // Trả lời tin nhắn
  const handleReply = () => {
    setReplyingMessage(selectedMessage);
    setIsMessageModalVisible(false);
  };

  // Xóa tin nhắn ở phía người dùng
  const handleDeleteForMe = async () => {
    if (selectedMessage) {
      try {
        await deleteMessageForUser(selectedMessage._id, currentUser._id, conversation._id);
        setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== selectedMessage._id));
        setIsMessageModalVisible(false);
      } catch (error) {
        console.error("Lỗi khi xóa tin nhắn ở phía tôi:", error);
        alert("Đã xảy ra lỗi khi xóa tin nhắn. Vui lòng thử lại.");
      }
    }
  };

  // --- Xử lý giao diện tin nhắn ---
  // Hiển thị tùy chọn khi nhấn giữ tin nhắn
  const renderMessageOptions = () => {
    const isCurrentUserMessage = selectedMessage?.user?._id === currentUser._id;
    return (
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.modalOption} onPress={handlePinMessage}>
          <Text>Ghim tin nhắn</Text>
        </TouchableOpacity>
        {isCurrentUserMessage && !selectedMessage?.isRecalled && (
          <TouchableOpacity style={styles.modalOption} onPress={handleRecall}>
            <Text>Thu hồi</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.modalOption} onPress={handleReply}>
          <Text>Trả lời</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalOption} onPress={handleDeleteForMe}>
          <Text>Xóa ở phía tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalOption} onPress={() => setIsMessageModalVisible(false)}>
          <Text>Hủy</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Hiển thị nội dung tin nhắn (văn bản hoặc thông báo thu hồi)
  const renderCustomText = (props) => {
    if (props.currentMessage.isRecalled) {
      return <Text style={{ color: "gray", fontStyle: "italic" }}>Tin nhắn đã bị thu hồi</Text>;
    }
    return <Text {...props.textProps}>{props.currentMessage.text}</Text>;
  };

  // Hiển thị bubble tin nhắn
  const renderBubble = (props) => {
    const { currentMessage } = props;
    const isCurrentUser = currentMessage.user._id === currentUser._id;
    const repliedToMessage = messages.find((msg) => msg._id === currentMessage.replyTo?._id);
    const isHighlighted = currentMessage._id === highlightedMessageId;

    return (
      <View>
        <Bubble
          {...props}
          wrapperStyle={{
            right: {
              padding: 10,
              borderRadius: 15,
              alignSelf: "flex-end",
              backgroundColor: isCurrentUser
                ? isHighlighted
                  ? "red"
                  : "#947bff"
                : isHighlighted
                ? "red"
                : "#7B61FF",
            },
            left: {
              padding: 10,
              borderRadius: 15,
              alignSelf: "flex-start",
              backgroundColor: isCurrentUser
                ? isHighlighted
                  ? "red"
                  : "#e0e0e0"
                : isHighlighted
                ? "red"
                : "#f0f0f0",
            },
          }}
          textStyle={{
            right: { color: "#fff" },
            left: { color: "#000" },
          }}
          onLongPress={(context, message) => {
            setSelectedMessage(message);
            setIsMessageModalVisible(true);
          }}
          renderCustomView={() =>
            repliedToMessage && repliedToMessage._id ? (
              <TouchableOpacity onPress={() => handleReplyToPress(repliedToMessage._id)}>
                <View
                  style={[
                    styles.embeddedRepliedMessageContainer,
                    isCurrentUser
                      ? styles.embeddedRepliedMessageRight
                      : styles.embeddedRepliedMessageLeft,
                  ]}
                >
                  <Text style={styles.embeddedRepliedToText}>
                    {repliedToMessage.user._id !== currentUser._id && (
                      <Text style={styles.embeddedRepliedToName}>
                        {repliedToMessage.user.name}:{" "}
                      </Text>
                    )}
                    {repliedToMessage.text ||
                      (repliedToMessage.image && "Ảnh") ||
                      (repliedToMessage.video && "Video") ||
                      (repliedToMessage.file && "Tệp")}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null
          }
        />
        {isCurrentUser &&
          currentMessage.seenBy?.some((s) => s.user === otherUser._id) && (
            <Text style={styles.seenText}>Đã xem</Text>
          )}
      </View>
    );
  };

  // Hiển thị avatar của người gửi
  const renderCustomAvatar = (props) => (
    <Image
      style={styles.messageAvatar}
      source={{ uri: props.currentMessage.user.avatar || "https://via.placeholder.com/50" }}
    />
  );

  // --- Xử lý cuộn và làm nổi bật tin nhắn ---
  // Cuộn tới tin nhắn cụ thể
  const scrollToMessage = (messageId) => {
    const index = messages.findIndex((msg) => msg._id === messageId);
    if (index !== -1 && flatListRef.current) {
      setScrollCompleted(false);
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  // Xử lý khi nhấn vào tin nhắn trả lời
  const handleReplyToPress = (messageId) => {
    const messageExists = messages.some((msg) => msg._id === messageId);
    if (messageExists) {
      setHighlightedMessageId(messageId);
    }
  };

  // Xử lý khi nhấn vào tin nhắn đã ghim
  const handlePinnedMessagePress = (messageId) => {
    const messageExists = messages.some((msg) => msg._id === messageId);
    if (messageExists) {
      setHighlightedMessageId(messageId);
    }
  };

  // Cuộn tới tin nhắn được làm nổi bật
  useEffect(() => {
    if (highlightedMessageId && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: messages.findIndex((msg) => msg._id === highlightedMessageId),
        animated: true,
        viewPosition: 0.5,
      });

      const timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId, messages]);

  // --- Xử lý emoji ---
  // Thêm emoji vào nội dung tin nhắn
  const handleEmojiSelect = (emoji) => {
    setText((prevText) => prevText + emoji);
  };

  // --- Giao diện chính ---
  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? -300 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Image
          source={{ uri: otherUser.avatar || "https://randomuser.me/api/portraits/men/1.jpg" }}
          style={styles.avatar}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{otherUser.username || "Người dùng"}</Text>
          <Text style={styles.online}>Online</Text>
        </View>
        <View style={styles.iconContainer}>
          <MaterialIcons name="call" size={24} color="black" style={styles.icon} />
          <MaterialIcons name="videocam" size={24} color="black" style={styles.icon} />
          <MaterialIcons name="info-outline" size={24} color="black" style={styles.icon} />
        </View>
      </View>

      {/* Hiển thị tin nhắn đang trả lời */}
      {replyingMessage && (
        <View style={styles.replyingContainer}>
          <Text style={styles.replyingToText}>Đang trả lời:</Text>
          <Text style={styles.replyingMessageText}>
            {replyingMessage.text ||
              (replyingMessage.image && "Ảnh") ||
              (replyingMessage.video && "Video") ||
              (replyingMessage.file && "Tệp")}
          </Text>
          <TouchableOpacity onPress={() => setReplyingMessage(null)}>
            <Ionicons name="close-circle" size={20} color="gray" />
          </TouchableOpacity>
        </View>
      )}

      {/* Hiển thị tin nhắn đã ghim */}
      {pinnedMessage && (
        <TouchableOpacity
          style={styles.pinnedMessageContainer}
          onPress={() => handlePinnedMessagePress(pinnedMessage._id)}
        >
          <View style={styles.pinnedIndicator}>
            <MaterialIcons name="push-pin" size={16} color="red" />
            <Text style={styles.pinnedText}> Đã ghim</Text>
          </View>
          <Text style={styles.pinnedContent}>
            {pinnedMessage.text ||
              (pinnedMessage.image && "Ảnh") ||
              (pinnedMessage.video && "Video") ||
              (pinnedMessage.file && "Tệp")}
          </Text>
          <TouchableOpacity onPress={() => handleUnpinMessage(pinnedMessage._id)}>
            <Ionicons name="close-circle" size={18} color="gray" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Hiển thị xem trước media */}
      {preview && (
        <View style={styles.previewContainer}>
          {preview.type === "image" && <Image source={{ uri: preview.uri }} style={styles.previewImage} />}
          {preview.type === "video" && (
            <Video source={{ uri: preview.uri }} style={styles.previewVideo} useNativeControls />
          )}
          {preview.type === "file" && <Text style={styles.previewText}>📄 {preview.name}</Text>}
          <TouchableOpacity onPress={() => setPreview(null)}>
            <Ionicons name="close-circle" size={24} color="red" />
          </TouchableOpacity>
        </View>
      )}

      {/* Danh sách tin nhắn */}
      <GiftedChat
      
        ref={giftedChatRef}
        listViewProps={{
          ref: flatListRef,
          key: highlightedMessageId,
          initialNumToRender: 50,
          maxToRenderPerBatch: 50,
          windowSize: 51,
          onScrollToIndexFailed: (info) => {
            setTimeout(() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.5,
                });
              }
            }, 500);
          },
          onLayout: () => {
            if (highlightedMessageId && !scrollCompleted) {
              setScrollCompleted(true);
            }
          },
          onScrollEndDrag: () => {
            if (highlightedMessageId && !scrollCompleted) {
              setScrollCompleted(true);
            }
          },
        }}
        messages={messages}
        onSend={onSend}
        user={{ _id: currentUser._id }}
        showUserAvatar={true}
        renderAvatar={renderCustomAvatar}
        text={text}
        onInputTextChanged={setText}
        renderMessageVideo={renderMessageVideo}
        renderMessageImage={renderMessageImage}
        renderMessageFile={renderMessageFile}
        renderBubble={renderBubble}
        renderActions={() => (
          <View style={styles.actionContainer}>
            <TouchableOpacity onPress={handleImagePick} style={styles.actionButton}>
              <MaterialIcons name="image" size={24} color="#7B61FF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleVideoPick} style={styles.actionButton}>
              <MaterialIcons name="videocam" size={24} color="#7B61FF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFilePick} style={styles.actionButton}>
              <MaterialIcons name="attach-file" size={24} color="#7B61FF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <MaterialIcons name="insert-emoticon" size={24} color="#7B61FF" />
            </TouchableOpacity>
          </View>
        )}
        renderSend={(props) => (
          <Send {...props}>
            <View style={styles.sendButton}>
              <Ionicons name="send" size={30} color="#7B61FF" />
            </View>
          </Send>
        )}
        // messagesContainerStyle={{ paddingBottom: 10 }}
        renderCustomText={renderCustomText}
      />

      {/* Modal chọn emoji */}
      {showEmojiPicker && (
        <Modal animationType="slide" transparent={true} visible={showEmojiPicker}>
          <View style={styles.emojiContainer}>
            <EmojiSelector onEmojiSelected={handleEmojiSelect} />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowEmojiPicker(false)}
            >
              <Ionicons name="close-circle" size={30} color="red" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}

      {/* Modal tùy chọn tin nhắn */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMessageModalVisible}
        onRequestClose={() => setIsMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {renderMessageOptions()}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}

// --- Styles ---
const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: "white",
},
header: {
  paddingTop: 10,
  flexDirection: "row",
  padding: 10,
  alignItems: "center",
  
},
avatar: {
  width: 40,
  height: 40,
  borderRadius: 20,
},
nameContainer: {
  flex: 1,
  marginLeft: 10,
},
name: {
  fontWeight: "bold",
},
online: {
  fontSize: 12,
  color: "green",
},
iconContainer: {
  flexDirection: "row",
},
icon: {
  marginLeft: 10,
},
previewContainer: {
  padding: 10,
  borderRadius: 5,
  backgroundColor: "#f0f0f0",
},
previewImage: {
  width: 200,
  height: 200,
  borderRadius: 10,
},
previewVideo: {
  width: 150,
  height: 100,
},
previewText: {
  fontSize: 16,
},
actionContainer: {
  flexDirection: "row",
  justifyContent: "center",
  paddingVertical: 10,
  paddingHorizontal: 5,
},
actionButton: {
  marginHorizontal: 10,
},
sendButton: {
  padding: 10,
  justifyContent: "center",
  alignItems: "center",
},
emojiContainer: {
  position: "absolute",
  bottom: 0,
  width: "100%",
  backgroundColor: "#fff",
  height: 250,
},
closeButton: {
  position: "absolute",
  top: 10,
  right: 10,
},
messageAvatar: {
  width: 30,
  height: 30,
  borderRadius: 15,
},
seenText: {
  fontSize: 10,
  color: "gray",
  alignSelf: "flex-start",
  marginLeft: 20,
},
modalOverlay: {
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
},
modalContent: {
  backgroundColor: "white",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
},
modalOption: {
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
  alignItems: "center",
},
pinnedMessageContainer: {
  backgroundColor: "lightyellow",
  padding: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
},
pinnedIndicator: {
  flexDirection: "row",
  alignItems: "center",
  marginRight: 10,
},
pinnedText: {
  fontSize: 12,
  color: "gray",
  marginLeft: 5,
},
pinnedContent: {
  flex: 1,
  fontSize: 16,
},
replyingContainer: {
  backgroundColor: "#f0f0f0",
  padding: 8,
  borderRadius: 5,
  marginBottom: 5,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},
replyingToText: {
  fontSize: 12,
  color: "gray",
},
replyingMessageText: {
  flex: 1,
  marginLeft: 5,
  fontSize: 14,
},
embeddedRepliedMessageContainer: {
  backgroundColor: "#e0e0e0",
  padding: 5,
  borderRadius: 5,
  marginBottom: 5,
},
embeddedRepliedMessageRight: {
  backgroundColor: "#d3d3d3",
  alignSelf: "flex-end",
},
embeddedRepliedMessageLeft: {
  backgroundColor: "#e0e0e0",
  alignSelf: "flex-start",
},
embeddedRepliedToText: {
  fontSize: 12,
  color: "gray",
},
embeddedRepliedToName: {
  fontWeight: "bold",
  color: "black",
},
fileContainer: {
  padding: 12,
  backgroundColor: "#f5f5f5",
  borderRadius: 10,
  marginVertical: 5,
  marginHorizontal: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderWidth: 1,
  borderColor: "#e0e0e0",
},
fileInfo: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},
fileName: {
  color: "#333",
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 4,
},
fileType: {
  color: "#666",
  fontSize: 12,
},
downloadButton: {
  padding: 8,
  backgroundColor: "#7B61FF",
  borderRadius: 8,
  flexDirection: "row",
  alignItems: "center",
},
downloadText: {
  color: "#fff",
  fontSize: 12,
  marginLeft: 4,
},
});