import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Linking,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  Dimensions,
  FlatList,
  ActivityIndicator
} from "react-native";
import { GiftedChat, Bubble, Send } from "react-native-gifted-chat";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import EmojiSelector from "react-native-emoji-selector";
import Lightbox from "react-native-lightbox";
import {
  uploadFiles,
  getMessages,
  pinMessage,
  recallMessage as recallMessageApi,
  deleteMessageForUser,
  getListFriend,
  createConversation,
  getConversations,
} from "../services/apiServices";
import { useFocusEffect } from "@react-navigation/native";
import io from "socket.io-client";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";

// Component chính cho màn hình chat
export default function ChatScreen({ navigation, route }) {
  // --- Khởi tạo state và ref ---
  const [messages, setMessages] = useState([]); // Danh sách tin nhắn
  const [previews, setPreviews] = useState([]); // Xem trước nhiều media
  const [text, setText] = useState(""); // Nội dung tin nhắn đang nhập
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // Hiển thị bảng chọn emoji
  const [selectedMessage, setSelectedMessage] = useState(null); // Tin nhắn được chọn khi nhấn giữ
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false); // Hiển thị modal tùy chọn tin nhắn
  const [pinnedMessage, setPinnedMessage] = useState(null); // Tin nhắn được ghim
  const [replyingMessage, setReplyingMessage] = useState(null); // Tin nhắn đang trả lời
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // ID tin nhắn được làm nổi bật
  const [scrollCompleted, setScrollCompleted] = useState(false); // Trạng thái cuộn hoàn tất
  const flatListRef = useRef(null); // Ref cho danh sách tin nhắn
 
  const socket = useRef(null); // Ref cho socket.io
  const { conversation, currentUser, otherUser } = route.params; // Thông tin cuộc trò chuyện, người dùng hiện tại và đối phương

  const [isForwardModalVisible, setIsForwardModalVisible] = useState(false); // Hiển thị modal chọn bạn bè
  const [friendList, setFriendList] = useState([]); // Danh sách bạn bè (cuộc trò chuyện)
  const [isDownloading, setIsDownloading] = useState(false);
  
  // --- Kết nối và xử lý socket ---
  useEffect(() => {
    // Khởi tạo socket và kết nối tới server
    socket.current = io("http://192.168.100.60:8004", {
      transports: ["websocket"],
    });
    socket.current.on("connect", () => {
      console.log("Socket connected: ", socket.current.id);
      socket.current.emit("markAsSeen", {
        conversationId: conversation._id,
        userId: currentUser._id,
      });
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
        isPinned: newMessage.isPinned || false, // Thêm isPinned
        replyTo: newMessage.replyTo || null,
      };
      setMessages((prevMessages) => {
        if (prevMessages.find((msg) => msg._id === formattedMessage._id)) {
          return prevMessages;
        }
        if (formattedMessage.isPinned) {
        // Cập nhật pinnedMessage nếu tin nhắn mới được ghim
        setPinnedMessage(formattedMessage);
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
            ? {
                ...msg,
                seenBy: [
                  ...(msg.seenBy || []),
                  { user: userId, seenAt: new Date(seenAt) },
                ],
              }
            : msg
        )
      );
    });

    // Lắng nghe sự kiện tin nhắn được cập nhật (thu hồi)
    socket.current.on("refreshMessages", (data) => {
      if (data.conversationId === conversation._id) {
        fetchMessages(); // Làm mới danh sách tin nhắn
      }
    });
    // Lấy danh sách bạn bè từ API
    const fetchFriends = async () => {
      try {
        const friends = await getListFriend(currentUser._id);
        setFriendList(friends);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè:", error);
        alert("Không thể lấy danh sách bạn bè. Vui lòng thử lại.");
      }
    };
    fetchFriends();

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
        if (
          msg.user._id !== currentUser._id &&
          !msg.seenBy?.some((s) => s.user === currentUser._id)
        ) {
          socket.current.emit("messageSeen", {
            messageId: msg._id,
            userId: currentUser._id,
          });
        }
      });
    }, [messages, currentUser._id])
  );

  // --- Lấy danh sách tin nhắn từ server ---
  const fetchMessages = async () => {
    try {
      const data = await getMessages(conversation._id);
      const formattedMessages = data.map((msg) => {
        const formattedMsg = {
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
        };
        console.log("Formatted message:", formattedMsg);
        return formattedMsg;
      });

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
  const onSend = useCallback(async (newMessages = []) => {
    const message = newMessages[0];
    let messageData = [];
  
    // Xử lý tin nhắn văn bản (nếu có)
    if (message.text && message.text.trim() !== "") {
      messageData.push({
        conversationId: conversation._id,
        senderId: currentUser._id,
        messageType: "text",
        text: message.text,
        imageUrl: "",
        videoUrl: "",
        fileUrl: "",
        fileName: "",
        iconCode: "",
        replyTo: replyingMessage ? replyingMessage._id : null,
      });
    }
  
    // Xử lý media (ảnh, video, file) từ previews
    if (previews.length > 0) {
      try {
        const files = previews.map((preview) => ({
          uri: preview.uri,
          name: preview.name,
          type: preview.type,
        }));
  
        console.log("Files to upload:", files);
        const responseData = await uploadFiles(files, conversation._id, currentUser._id);
  
        if (responseData && responseData.success) {
          // Xử lý ảnh
          if (responseData.imageUrls && responseData.imageUrls.length > 0) {
            responseData.imageUrls.forEach((url) => {
              messageData.push({
                conversationId: conversation._id,
                senderId: currentUser._id,
                messageType: "image",
                text: "",
                imageUrl: url,
                videoUrl: "",
                fileUrl: "",
                fileName: "",
                iconCode: "",
                replyTo: replyingMessage ? replyingMessage._id : null,
              });
            });
          }
  
          // Xử lý video
          if (responseData.videoUrls && responseData.videoUrls.length > 0) {
            responseData.videoUrls.forEach((url, index) => {
              const videoPreview = previews.find((p) => p.type.includes("video"));
              messageData.push({
                conversationId: conversation._id,
                senderId: currentUser._id,
                messageType: "video",
                text: "",
                imageUrl: "",
                videoUrl: url,
                fileUrl: "",
                fileName: videoPreview?.name || `video_${index}`,
                iconCode: "",
                replyTo: replyingMessage ? replyingMessage._id : null,
              });
            });
          }
  
          // Xử lý file
          if (responseData.fileUrls && responseData.fileUrls.length > 0) {
            responseData.fileUrls.forEach((url, index) => {
              const filePreview = previews.find((p) => p.type.includes("application") || p.type.includes("text"));
              if (!filePreview) {
                console.warn("No matching file preview found for index:", index);
                return;
              }
              messageData.push({
                conversationId: conversation._id,
                senderId: currentUser._id,
                messageType: "file",
                text: `📄 ${filePreview.name}`,
                imageUrl: "",
                videoUrl: "",
                fileUrl: url,
                fileName: filePreview.name,
                iconCode: "",
                replyTo: replyingMessage ? replyingMessage._id : null,
              });
            });
          }
        } else {
          console.error("Upload failed with response:", responseData);
          alert(responseData?.message || "Lỗi khi tải lên files.");
          return;
        }
      } catch (error) {
        console.error("Lỗi khi gửi tin nhắn media:", error);
        let errorMessage = "Không thể gửi tin nhắn.";
        if (error.response?.data) {
          if (typeof error.response.data === "string") {
            if (error.response.data.includes("File type not allowed")) {
              errorMessage = "Loại file không được phép. Chỉ hỗ trợ PDF, DOC, DOCX, TXT, ZIP, XLS, XLSX.";
            } else {
              errorMessage = "Lỗi server không xác định. Vui lòng thử lại.";
            }
          } else {
            errorMessage = error.response.data.message || error.message;
          }
        } else {
          errorMessage = error.message || "Lỗi kết nối server.";
        }
        alert(errorMessage);
        return;
      }
    }
  
    // Nếu không có tin nhắn văn bản hoặc media, không gửi
    if (messageData.length === 0) {
      return; // Không hiển thị alert để tránh làm phiền người dùng
    }
  
    // Gửi tất cả tin nhắn qua socket
    try {
      messageData.forEach((data) => {
        socket.current.emit("sendMessage", data);
      });
      setReplyingMessage(null);
      setPreviews([]); // Xóa previews sau khi gửi
      setText(""); // Xóa văn bản sau khi gửi
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
    }
  }, [conversation._id, currentUser._id, previews, replyingMessage]);



  // --- Xử lý media (ảnh, video, file) ---
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
        const selectedImages = result.assets.map((asset) => {
          const extension = asset.uri.split(".").pop()?.toLowerCase();
          const mimeType =
            extension === "png" ? "image/png" : "image/jpeg"; // Đảm bảo MIME type chính xác
          return {
            uri: asset.uri,
            name: asset.fileName || `image_${Date.now()}.${extension}`,
            type: mimeType,
          };
        });
        setPreviews((prev) => [...prev, ...selectedImages]);
      }
    } catch (error) {
      console.error("Error in handleImagePick:", error);
      alert("Lỗi khi chọn ảnh: " + error.message);
    }
  };
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
        const selectedVideos = result.assets.map((asset) => {
          const extension = asset.uri.split(".").pop()?.toLowerCase();
          let mimeType = "video/mp4"; // Mặc định
          switch (extension) {
            case "mov":
              mimeType = "video/quicktime";
              break;
            case "mkv":
              mimeType = "video/x-matroska";
              break;
            case "avi":
              mimeType = "video/x-msvideo";
              break;
            case "webm":
              mimeType = "video/webm";
              break;
            default:
              mimeType = "video/mp4";
          }
          return {
            uri: asset.uri,
            name: asset.fileName || `video_${Date.now()}.${extension}`,
            type: mimeType,
          };
        });
        setPreviews((prev) => [...prev, ...selectedVideos]);
      }
    } catch (error) {
      console.error("Error in handleVideoPick:", error);
      alert("Lỗi khi chọn video: " + error.message);
    }
  };
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/x-zip-compressed",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) {
        console.log("File pick canceled");
        return;
      }
  
      const selectedFiles = result.assets.map((asset) => {
        // Lấy MIME type từ DocumentPicker
        let mimeType = asset.mimeType || "application/octet-stream";
        const name = asset.name || `file_${Date.now()}`;
  
        // Kiểm tra MIME type hợp lệ
        const validMimeTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/x-zip-compressed",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        if (!validMimeTypes.includes(mimeType)) {
          console.error(`Unsupported MIME type: ${mimeType}`);
          throw new Error(`Loại file không được hỗ trợ: ${name}`);
        }
  
        // Xử lý tên file
        let extension = "bin";
        switch (mimeType) {
          case "application/pdf":
            extension = "pdf";
            break;
          case "application/msword":
            extension = "doc";
            break;
          case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            extension = "docx";
            break;
          case "text/plain":
            extension = "txt";
            break;
          case "application/x-zip-compressed":
            extension = "zip";
            break;
          case "application/vnd.ms-excel":
            extension = "xls";
            break;
          case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
            extension = "xlsx";
            break;
          default:
            console.warn(`No extension mapped for MIME type: ${mimeType}`);
        }
  
        // Đảm bảo tên file có phần mở rộng đúng
        const fileName = name.includes(".") ? name : `${name}.${extension}`;
  
        const fileData = {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        };
        console.log("Selected file:", fileData);
        if (!fileData.uri || !fileData.name || !fileData.type) {
          console.error("Invalid file data:", fileData);
          throw new Error("Dữ liệu file không hợp lệ");
        }
        return fileData;
      });
  
      setPreviews((prev) => [...prev, ...selectedFiles]);
    } catch (error) {
      console.error("Error picking document:", error);
      alert(`Lỗi khi chọn tài liệu: ${error.message}`);
    }
  };
// --- Render preview item ---
const renderPreviewItem = ({ item }) => (
  <View style={styles.previewItem}>
    {item.type.includes("image") && (
      <Image source={{ uri: item.uri }} style={styles.previewImage} />
    )}
    {item.type.includes("video") && (
      <Video
        source={{ uri: item.uri }}
        style={styles.previewVideo}
        useNativeControls
      />
    )}
    {item.type.includes("application") && (
      <Text style={styles.previewText}>📄 {item.name}</Text>
    )}
    <TouchableOpacity
      style={styles.previewRemoveButton}
      onPress={() => setPreviews((prev) => prev.filter((p) => p.uri !== item.uri))}
    >
      <Ionicons name="close-circle" size={24} color="red" />
    </TouchableOpacity>
  </View>
);
  // --- Render các loại tin nhắn (ảnh, video, file) ---
  // Hiển thị tin nhắn ảnh
 

  const renderMessageImage = (props) => {
    const { currentMessage } = props;
    if (currentMessage.isRecalled) {
      return (
        <Text style={{ color: "gray", fontStyle: "italic" }}>
          Tin nhắn đã bị thu hồi
        </Text>
      );
    }
    const imageUrl = currentMessage.image;
    const fileName = `image_${Date.now()}.jpg`; // Tạo tên file động

    const handleDownload = async () => {
      if (!imageUrl) {
        alert("Không tìm thấy link tải xuống cho hình ảnh này.");
        return;
      }
     await downloadFile(imageUrl, fileName);
    };

    return (
      <View style={styles.mediaContainer}>
        <Lightbox activeProps={{ resizeMode: "contain" }}>
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 50,
            }}
          >
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 200, height: 200, borderRadius: 10 }}
              resizeMode="cover"
            />
          </View>
        </Lightbox>
        <TouchableOpacity
          onPress={handleDownload}
          style={styles.downloadIconContainer}
          disabled={isDownloading}
        >
              {isDownloading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialIcons name="file-download" size={20} color="#fff" />
                )}
        </TouchableOpacity>
      </View>
    );
  };

  // Hiển thị tin nhắn video
  const renderMessageVideo = (props) => {
    const { currentMessage } = props;
    if (currentMessage.isRecalled) {
      return (
        <Text style={{ color: "gray", fontStyle: "italic" }}>
          Tin nhắn đã bị thu hồi
        </Text>
      );
    }
    const videoUrl = currentMessage.video;
    const fileName = currentMessage.fileName || `video_${Date.now()}.mp4`;
    const handleDownload = async () => {
      if (!videoUrl) {
        alert("Không tìm thấy link tải xuống cho video này.");
        return;
      }
      await downloadFile(videoUrl, fileName);
    };

    return (
      <View style={styles.mediaContainer}>
        <Video
          source={{ uri: videoUrl }}
          style={{ width: 250, height: 200 }}
          useNativeControls
          resizeMode="contain"
        />
        <TouchableOpacity
          onPress={handleDownload}
          style={styles.downloadIconContainer}
          disabled={isDownloading}
        >
          {isDownloading ? (
    <ActivityIndicator size="small" color="#fff" />
  ) : (
    <MaterialIcons name="file-download" size={20} color="#fff" />
  )}
        </TouchableOpacity>
      </View>
    );
  };

  // Hiển thị tin nhắn file
  const renderMessageFile = (props) => {
    const { currentMessage } = props;
    if (currentMessage.isRecalled) {
      return (
        <Text style={{ color: "gray", fontStyle: "italic" }}>
          Tin nhắn đã bị thu hồi
        </Text>
      );
    }
     const fileName =
      currentMessage.fileName ||
      currentMessage.text?.replace("📄 ", "") ||
      "Tệp không xác định";
      const fileType = fileName.split('.').pop().toUpperCase() || 'UNKNOWN';

    const fileUrl = currentMessage.file;
    // Giới hạn tên file (ví dụ: 20 ký tự)
    const truncatedFileName =
      fileName.length > 10 ? `${fileName.substring(0, 17)}...` : fileName;

    const handleDownload = async () => {
      if (!fileUrl) {
        alert('Không tìm thấy link tải xuống cho file này.');
        return;
      }
      await downloadFile(fileUrl, fileName);
    };
  
    // Hàm để chọn biểu tượng hoặc văn bản dựa trên loại tệp
    const renderFileIcon = () => {
     
      switch (fileType.toLowerCase()) {
        case 'doc':
        case 'docx':
          return <MaterialIcons name="description" size={24} color="#fff" />;
        case 'pdf':
          return <MaterialIcons name="picture-as-pdf" size={24} color="#fff" />;
        default:
          return <Ionicons name="document" size={24} color="#fff" />; // Biểu tượng chung cho các loại tệp khác
      }
    };
  
    return (
      <TouchableOpacity
        onLongPress={() => {
          setSelectedMessage(currentMessage);
          setIsMessageModalVisible(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          backgroundColor: '#f5f5f5',
          borderRadius: 8,
          marginVertical: 5,
        }}
      >
        {/* File Icon */}
        <View
          style={{
            width: 40,
            height: 40,
            backgroundColor: '#0078D4', // Blue background
            borderRadius: 5,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 10,
          }}
        >
          {renderFileIcon()}
        </View>
        <Text>{truncatedFileName}</Text>
       
  
       
        
          <TouchableOpacity
            onPress={handleDownload}
            style={{
              backgroundColor: '#7B61FF',
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 5,
            }}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 12 }}>Tải xuống</Text>
            )}
          </TouchableOpacity>
      
      </TouchableOpacity>
    );
  };


  // --- Xử lý tin nhắn (ghim, thu hồi, trả lời, xóa) ---
  // Ghim tin nhắn
  const handlePinMessage = async () => {
    if (selectedMessage) {
      try {
        const response = await pinMessage(selectedMessage._id, { isPinned: true });
        console.log("pinMessage response:", response); // Debug API response
        if (response.isPinned) {
          // Bỏ ghim các tin nhắn cũ cục bộ
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg._id === selectedMessage._id
                ? { ...msg, isPinned: true }
                : { ...msg, isPinned: false }
            )
          );
          setPinnedMessage({ ...selectedMessage, isPinned: true });
          setIsMessageModalVisible(false);
          if (socket.current && conversation._id && selectedMessage._id) {
            console.log("Emitting messageUpdated for pin:", {
              conversationId: conversation._id,
              messageId: selectedMessage._id,
              isSender: selectedMessage.user._id === currentUser._id,
            });
            socket.current.emit("messageUpdated", {
              conversationId: conversation._id,
              messageId: selectedMessage._id,
            });
          }
        } else {
          console.error("API pinMessage failed: isPinned not true", response);
          alert("Không thể ghim tin nhắn. Phản hồi API không hợp lệ.");
        }
      } catch (error) {
        console.error("Lỗi khi ghim tin nhắn:", error.response?.data || error.message);
        alert("Đã xảy ra lỗi khi ghim tin nhắn: " + (error.response?.data?.error || error.message));
      }
    }
  };

  // Bỏ ghim tin nhắn
  const handleUnpinMessage = async (messageId) => {
    try {
      const response = await pinMessage(messageId, { isPinned: false });
      console.log("unpinMessage response:", response); // Debug API response
      if (response.isPinned === false) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === messageId ? { ...msg, isPinned: false } : msg
          )
        );
        setPinnedMessage(null);
        if (selectedMessage && selectedMessage._id === messageId) {
          setSelectedMessage(null);
        }
        if (socket.current && conversation._id) {
          console.log("Emitting messageUpdated for unpin:", {
            conversationId: conversation._id,
            messageId: messageId,
          });
          socket.current.emit("messageUpdated", {
            conversationId: conversation._id,
            messageId: messageId,
          });
        }
      } else {
        console.error("API unpinMessage failed: isPinned not false", response);
        alert("Không thể bỏ ghim tin nhắn. Phản hồi API không hợp lệ.");
      }
    } catch (error) {
      console.error("Lỗi khi bỏ ghim tin nhắn:", error.response?.data || error.message);
      alert("Đã xảy ra lỗi khi bỏ ghim tin nhắn: " + (error.response?.data?.error || error.message));
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
              ? {
                  ...msg,
                  text: "Tin nhắn đã bị thu hồi",
                  image: null,
                  video: null,
                  file: null,
                  isRecalled: true,
                }
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
        await deleteMessageForUser(
          selectedMessage._id,
          currentUser._id,
          conversation._id
        );
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== selectedMessage._id)
        );
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
        <TouchableOpacity
          style={styles.modalOption}
          onPress={() => {
            setIsMessageModalVisible(false);
            setIsForwardModalVisible(true);
          }}
        >
          <Text>Chuyển tiếp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalOption}
          onPress={handleDeleteForMe}
        >
          <Text>Xóa ở phía tôi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modalOption}
          onPress={() => setIsMessageModalVisible(false)}
        >
          <Text>Hủy</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderForwardModal = () => {
    return (
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Chuyển tiếp tin nhắn đến:</Text>
        {friendList.map((friend) => (
          <TouchableOpacity
            key={friend._id}
            style={styles.friendItem}
            onPress={() => handleForwardMessage(friend)}
          >
            <Image
              source={{
                uri: friend.avatar || "https://via.placeholder.com/50",
              }}
              style={styles.friendAvatar}
            />
            <Text style={styles.friendName}>{friend.username}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.modalOption}
          onPress={() => setIsForwardModalVisible(false)}
        >
          <Text>Hủy</Text>
        </TouchableOpacity>
      </View>
    );
  };
  // Hiển thị nội dung tin nhắn (văn bản hoặc thông báo thu hồi)
  const renderCustomText = (props) => {
    if (props.currentMessage.isRecalled) {
      return (
        <Text style={{ color: "gray", fontStyle: "italic" }}>
          Tin nhắn đã bị thu hồi
        </Text>
      );
    }
    return <Text {...props.textProps}>{props.currentMessage.text}</Text>;
  };

  // Hiển thị bubble tin nhắn
  const renderBubble = (props) => {
    const { currentMessage } = props;
    const isCurrentUser = currentMessage.user._id === currentUser._id;
    const repliedToMessage = messages.find(
      (msg) => msg._id === currentMessage.replyTo?._id
    );
    const isHighlighted = currentMessage._id === highlightedMessageId;

    // Nếu là tin nhắn file, không hiển thị bubble mặc định
    if (currentMessage.file) {
      return (
        <View style={{ marginVertical: 5 }}>{renderMessageFile(props)}</View>
      );
    }

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
                  : "#007AFF"
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
              <TouchableOpacity
                onPress={() => handleReplyToPress(repliedToMessage._id)}
              >
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
      source={{
        uri:
          props.currentMessage.user.avatar || "https://via.placeholder.com/50",
      }}
    />
  );

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

  useEffect(() => {
    if (highlightedMessageId) {
      // Tạo một bản sao mới của messages để ép re-render
      setMessages((prevMessages) => [...prevMessages]);
    }
  }, [highlightedMessageId]);

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

  // Xử lý chuyển tiếp tin nhắn
  const handleForwardMessage = async (friend) => {
    if (!selectedMessage) return;

    try {
      let conversationId = null;
      const userConversations = await getConversations(currentUser._id);
      console.log("Danh sách cuộc trò chuyện:", userConversations);
      console.log(
        "currentUser._id:",
        currentUser._id,
        "friend._id:",
        friend._id
      );

      const existingConversation = userConversations.find((conv) => {
        console.log("Conversation members:", conv.members);
        // Kiểm tra xem trong conv.members có chứa cả currentUser._id và friend._id không
        const hasCurrentUser = conv.members.some(
          (member) => member._id === currentUser._id
        );
        const hasFriend = conv.members.some(
          (member) => member._id === friend._id
        );
        return hasCurrentUser && hasFriend && !conv.isGroup;
      });

      if (existingConversation) {
        console.log("Tìm thấy cuộc trò chuyện hiện có:", existingConversation);
        conversationId = existingConversation._id;
      } else {
        console.log("Không tìm thấy cuộc trò chuyện, tạo mới...");
        const newConversation = await createConversation([
          currentUser._id,
          friend._id,
        ]);
        conversationId = newConversation._id;
      }

      const messageType = selectedMessage.image
        ? "image"
        : selectedMessage.video
        ? "video"
        : selectedMessage.file
        ? "file"
        : "text";

      const forwardedMessage = {
        conversationId: conversationId,
        senderId: currentUser._id,
        messageType: messageType,
        text: selectedMessage.text || "",
        imageUrl: selectedMessage.image || "",
        videoUrl: selectedMessage.video || "",
        fileUrl: selectedMessage.file || "",
        fileName: selectedMessage.fileName || "",
        iconCode: "",
        replyTo: null,
        forwardedFrom: {
          user: selectedMessage.user.name,
          conversationId: conversation._id,
        },
      };

      socket.current.emit("sendMessage", forwardedMessage);
      setIsForwardModalVisible(false);
      alert(`Tin nhắn đã được chuyển tiếp đến ${friend.username}`);
    } catch (error) {
      console.error("Lỗi khi chuyển tiếp tin nhắn:", error);
      alert("Đã xảy ra lỗi khi chuyển tiếp tin nhắn. Vui lòng thử lại.");
    }
  };

  //Xử lý download file trên giao diện
  const downloadFile = async (url, fileName) => {
    setIsDownloading(true);
    let fileUri = null; // Biến để lưu fileUri, dùng trong khối finally
  
    try {
      // Kiểm tra URL hợp lệ
      if (!url || !url.startsWith("http")) {
        throw new Error("URL tải xuống không hợp lệ.");
      }
  
      console.log("URL tải xuống:", url); // Debug URL
  
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const timestamp = Date.now(); // Thêm timestamp để tránh xung đột tên file
      const uniqueFileName = `${timestamp}_${cleanFileName}`;
      fileUri = `${FileSystem.documentDirectory}${uniqueFileName}`;
  
      console.log("fileUri:", fileUri); // Debug fileUri
  
      // Tải file từ URL về thư mục tạm
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Lỗi khi tải file: HTTP status ${downloadResult.status}`);
      }
  
      // Kiểm tra file có tồn tại không
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error(`File tạm tại ${fileUri} không tồn tại sau khi tải.`);
      }
  
      // Kiểm tra loại file dựa trên phần mở rộng
      const fileExtension = cleanFileName.split(".").pop().toLowerCase();
      const isMediaFile = ["jpg", "jpeg", "png", "mp4", "mov", "avi"].includes(fileExtension);
  
      if (isMediaFile) {
        // Nếu là ảnh hoặc video, lưu vào Media Library
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Cần cấp quyền truy cập thư viện để lưu file!");
        }
  
        const asset = await MediaLibrary.createAssetAsync(fileUri);
        await MediaLibrary.createAlbumAsync("Downloads", asset, false);
  
        alert(`File ${cleanFileName} đã được tải về thành công! Kiểm tra trong thư viện ảnh/video.`);
      } else {
        // Nếu là file tài liệu (docx, pdf, v.v.), lưu vào thư mục công khai hoặc chia sẻ
        if (Platform.OS === "android") {
          // Trên Android, lưu vào thư mục Downloads công khai
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (!permissions.granted) {
            throw new Error("Cần cấp quyền truy cập để lưu file!");
          }
  
          const directoryUri = permissions.directoryUri;
          const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            directoryUri,
            cleanFileName,
            "application/octet-stream"
          );
  
          // Đọc nội dung file tạm và ghi vào file mới
          const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.StorageAccessFramework.writeAsStringAsync(
            newFileUri,
            fileContent,
            { encoding: FileSystem.EncodingType.Base64 }
          );
  
          alert(`File ${cleanFileName} đã được tải về thành công! Kiểm tra trong thư mục Downloads.`);
        } else {
          // Trên iOS, không cần di chuyển file vì fileUri đã nằm trong FileSystem.documentDirectory
          // Kiểm tra thư mục FileSystem.documentDirectory
          const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
          if (!dirInfo.exists) {
            throw new Error(`Thư mục ${FileSystem.documentDirectory} không tồn tại.`);
          }
  
          // Thông báo trước khi mở giao diện chia sẻ
          alert(`File ${cleanFileName} đã được tải về. Vui lòng chọn nơi lưu file.`);
  
          // Sử dụng trực tiếp fileUri để chia sẻ
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            // Mở giao diện chia sẻ để người dùng tự lưu file
            await Sharing.shareAsync(fileUri);
  
            // Thông báo sau khi giao diện chia sẻ đóng
            alert(
              `Đã hoàn tất. Vui lòng kiểm tra file ${cleanFileName} tại nơi bạn đã chọn để lưu (ví dụ: Files app, iCloud). Nếu bạn không chọn lưu, file sẽ không được giữ lại.`
            );
          } else {
            // Nếu không hỗ trợ chia sẻ, thông báo vị trí file
            alert(
              `File ${cleanFileName} đã được tải về thành công! File nằm trong thư mục tài liệu của ứng dụng.`
            );
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải file:", error.message);
      alert(`Không thể tải file: ${error.message}`);
    } finally {
      // Đảm bảo xóa file tạm trong mọi trường hợp (kể cả khi có lỗi)
      if (fileUri) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log("Đã xóa file tạm:", fileUri); // Debug xóa file
      }
      setIsDownloading(false);
    }
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
            source={{
              uri:
                otherUser.avatar ||
                "https://randomuser.me/api/portraits/men/1.jpg",
            }}
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {otherUser.username || "Người dùng"}
            </Text>
            <Text style={styles.online}>Online</Text>
          </View>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name="call"
              size={24}
              color="black"
              style={styles.icon}
            />
            <MaterialIcons
              name="videocam"
              size={24}
              color="black"
              style={styles.icon}
            />
            <MaterialIcons
              name="info-outline"
              size={24}
              color="black"
              style={styles.icon}
            />
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
            <TouchableOpacity
              onPress={() => handleUnpinMessage(pinnedMessage._id)}
            >
              <Ionicons name="close-circle" size={18} color="gray" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Hiển thị xem trước media */}
        {previews.length > 0 && (
          <View style={styles.previewContainer}>
            <FlatList
              data={previews}
              renderItem={renderPreviewItem}
              keyExtractor={(item) => item.uri}
              horizontal
              showsHorizontalScrollIndicator={false}
            />
            
          </View>
        )}

        {/* Danh sách tin nhắn */}
        <GiftedChat
  
  listViewProps={{
    ref: flatListRef,
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
        <MaterialIcons name="image" size={24} color="#007AFF" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleVideoPick} style={styles.actionButton}>
        <MaterialIcons name="videocam" size={24} color="#007AFF" />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleFilePick} style={styles.actionButton}>
        <MaterialIcons name="attach-file" size={24} color="#007AFF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowEmojiPicker(!showEmojiPicker)}
      >
        <MaterialIcons name="insert-emoticon" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  )}
  renderSend={(props) => (
    <TouchableOpacity
      style={styles.sendButton}
      disabled={!(text.trim().length > 0 || previews.length > 0)}
      onPress={() => {
        if (text.trim().length > 0 || previews.length > 0) {
          const message = {
            _id: Math.random().toString(36).substring(7),
            text: text.trim(),
            createdAt: new Date(),
            user: { _id: currentUser._id },
          };
          props.onSend([message], true);
        }
      }}
    >
      <Ionicons
        name="send"
        size={30}
        color={text.trim().length > 0 || previews.length > 0 ? "#7B61FF" : "#ccc"}
      />
    </TouchableOpacity>
  )}
  alwaysShowSend={true}
  shouldUpdateMessage={(props, nextProps) =>
    props.currentMessage._id === highlightedMessageId ||
    nextProps.currentMessage._id === highlightedMessageId
  }
  renderCustomText={renderCustomText}
/>

        {/* Modal chọn emoji */}
        {showEmojiPicker && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={showEmojiPicker}
          >
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
          <View style={styles.modalOverlay}>{renderMessageOptions()}</View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isForwardModalVisible}
          onRequestClose={() => setIsForwardModalVisible(false)}
        >
          <View style={styles.modalOverlay}>{renderForwardModal()}</View>
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
  previewContainer: { padding: 10, backgroundColor: "#f0f0f0", borderRadius: 5 },
previewItem: { marginRight: 10, alignItems: "center" },
previewImage: { width: 100, height: 100, borderRadius: 10 },
previewVideo: { width: 100, height: 100, borderRadius: 10 },
previewText: { fontSize: 14, marginVertical: 5 },
previewRemoveButton: { position: "absolute", top: -10, right: -10 },

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
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1, // Thêm border để debug
    marginVertical: 5,
  },
  fileInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  fileType: {
    fontSize: 12,
    color: "#666",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7B61FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1, // Thêm border để debug
    borderRadius: 6,
  },
  downloadText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
  },

  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "lightgray", // Thêm màu nền để kiểm tra xem component có hiển thị không
  },
  friendItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
}); 
