import React, { useState, useEffect, useRef, useCallback } from "react"; // Added useRef import
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Platform } from "react-native";
import { GiftedChat, Bubble, Send, Message } from "react-native-gifted-chat"; // Import Message
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import EmojiSelector from "react-native-emoji-selector";
import Lightbox from "react-native-lightbox";
import { getMessages, pinMessage } from "../services/apiServices";
import { useFocusEffect } from '@react-navigation/native';
import io from "socket.io-client";

export default function ChatScreen({ navigation, route }) {
  const [messages, setMessages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { conversation, currentUser, otherUser } = route.params;
  

  const [selectedMessage, setSelectedMessage] = useState(null); // State to hold the selected message
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false); // State to control modal visibility
  const [pinnedMessage, setPinnedMessage] = useState(null);
 

  
  
  const socket = useRef(null);
  // Kết nối với socket server
  useEffect(() => {
    socket.current = io("http://192.168.100.60:8004", { transports: ["websocket"] }); // Thay thế bằng URL backend
    socket.current.on("connect", () => {
      console.log("Socket connected: ", socket.current.id);
      // Emit sự kiện markAsSeen khi kết nối và vào màn hình chat
      socket.current.emit("markAsSeen", { conversationId: conversation._id, userId: currentUser._id });
    });

    // Nhận tin nhắn mới từ server
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
      };
      setMessages((prevMessages) =>
        GiftedChat.append(prevMessages, [formattedMessage])
      );
    });

    // Lắng nghe sự kiện tin nhắn đã xem
    socket.current.on(`messageSeen-${conversation._id}`, (data) => {
      const { messageId, userId, seenAt } = data;
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                seenBy: [...(msg.seenBy || []), { user: userId, seenAt: new Date(seenAt) }],
              }
            : msg
        )
      );
    });
    return () => {
      // Hủy kết nối socket khi component bị unmount
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [conversation._id]);

  useFocusEffect(
    useCallback(() => {
      // Hàm này sẽ chạy khi màn hình được focus
      messages.forEach((msg) => {
        // Chỉ gửi sự kiện nếu tin nhắn không phải của người dùng hiện tại và chưa được đánh dấu là đã xem bởi người dùng hiện tại
        if (msg.user._id !== currentUser._id && !msg.seenBy?.some(s => s.user === currentUser._id)) {
          socket.current.emit("messageSeen", { messageId: msg._id, userId: currentUser._id });
        }
      });
    }, [messages, currentUser._id])
  );

  const fetchMessages = async () => {
    try {
      const data = await getMessages(conversation._id);
      const formattedMessages = data.map((msg) => ({
        _id: msg._id,
        text: msg.text || "",
        createdAt: new Date(msg.createdAt),
        user: {
          _id: msg.senderId._id ,
          name: msg.senderId.username ,
          avatar: msg.senderId.avatar
        },
        image: msg.imageUrl || undefined,
        video: msg.videoUrl || undefined,
        file: msg.fileUrl || undefined,
        seenBy: msg.seenBy || [],
        isPinned: msg.isPinned || false,
      }));

      

      // Lọc tin nhắn đã ghim
      const pinned = formattedMessages.find((msg) => msg.isPinned);
      setPinnedMessage(pinned || null);

      

      setMessages(formattedMessages.reverse());
      console.log("HinhAnh", formattedMessages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      alert('Failed to fetch messages. Please try again.');
    }
  };
    useEffect(() => {
      fetchMessages();
      }, [conversation._id]);


  const onSend = useCallback(async (newMessages = []) => {

  const message = newMessages[0];
  const messageData = {
    conversationId: conversation._id,
    senderId: currentUser._id,
    messageType: message.text ? 'text' : (message.image ? 'image' : (message.video ? 'video' : 'file')),
    text: message.text || '',
    imageUrl: message.image || '',
    videoUrl: message.video || '',
    fileUrl: message.file || '',
    fileName: message.file ? message.file.split('/').pop() : '',
    iconCode: '',
    replyTo: message.replyTo || null,
  };

  try {

      // Phát sự kiện tin nhắn qua socket
      socket.current.emit("sendMessage", messageData);
  } catch (error) {
    console.error("Error sending message:", error);
    alert("Failed to send message. Please try again.");
  }

  setText(""); // Reset text input
  setPreview(null); // Reset preview
}, [conversation._id, currentUser._id]);


  // Các phương thức khác xử lý gửi hình ảnh, video, file và emoji
  const handleEmojiSelect = (emoji) => {
    setText((prevText) => prevText + emoji);
  };
  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPreview({ type: "image", uri: result.assets[0].uri });
      sendMediaMessage(result.assets[0].uri, "image");
    }
  };
  const handleVideoPick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setPreview({ type: "video", uri: result.assets[0].uri });
      sendMediaMessage(result.assets[0].uri, "video");
    }
  };
  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (result.canceled) return;
      setPreview({ type: "file", uri: result.uri, name: result.name });
      sendMediaMessage(result.uri, "file", result.name);
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };
  const sendMediaMessage = (uri, type, fileName = "") => {
    let fileTypeText = fileName ? `📄 ${fileName}` : "📄 Unknown File";

    const mediaMessage = {
      _id: Math.random().toString(),
      createdAt: new Date(),
      user: { _id: currentUser._id },
      image: type === "image" ? uri : undefined,
      video: type === "video" ? uri : undefined,
      text: type === "file" ? fileTypeText : "",
    };

    onSend([mediaMessage]);
  };

  // Render functions for media
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
  const renderMessageVideo = (props) => {
    const { currentMessage } = props;
    return (
        <View style={{ padding: 10 }}>
            <Video
                source={{ uri: currentMessage.video }}
                style={{ width: 150, height: 100 }}
                useNativeControls
                resizeMode="contain"
            />
        </View>
    );
};
/////////////////////////////////////////////////////////////////////////////
  
const renderBubble = (props) => {
  const { currentMessage } = props;
  const isCurrentUser = currentMessage.user._id === currentUser._id;
 
  
  return (
    <View>
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            padding: 10,
            borderRadius: 15,
            alignSelf: 'flex-end',
            backgroundColor: isCurrentUser ? "#7B61FF" :  "#f0f0f0", // Highlight for right bubble
          },
          left: {
            padding: 10,
            borderRadius: 15,
            alignSelf: 'flex-start',
            backgroundColor: isCurrentUser ? "#f0f0f0" : "#ffffff", // Highlight for left bubble
          },
        }}
        textStyle={{
          right: { color: "#fff" },
          left: { color: "#000" },
        }}
        onLongPress={(context, message) => handleMessageLongPress(context, message)} // Add long press handler
      />
      {/* Hiển thị trạng thái "đã xem" cho tin nhắn của người khác */}
      {isCurrentUser && currentMessage.seenBy?.some(s => s.user === otherUser._id) &&(
        <Text style={styles.seenText}>Đã xem</Text>
      )}
    </View>
  );
};
  const renderCustomAvatar = (props) => {
  return (
    <Image
      style={styles.messageAvatar}
      source={{ uri: props.currentMessage.user.avatar || 'https://via.placeholder.com/50' }}
    />
  );
};


/////////////////////////////////GHIM Tin NHAN/////////////////

//xử lý nhấn giữ hiện modal 
const handleMessageLongPress = (context, message) => {
  setSelectedMessage(message);
  setIsMessageModalVisible(true);
};
const handlePinMessage = async () => {
  if (selectedMessage) {
    try {
      const response = await pinMessage(selectedMessage._id,{ isPinned: true });
      console.log("Kiem Tra Pin Chua:", response);

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === selectedMessage._id ? { ...msg, isPinned: true } : msg
        )
      );

      // Cập nhật tin nhắn ghim vào state
      setPinnedMessage(selectedMessage);

      setIsMessageModalVisible(false);
      
    } catch (error) {
      console.error("Lỗi khi ghim tin nhắn:", error);
      alert("Đã xảy ra lỗi khi ghim tin nhắn. Vui lòng thử lại.");
    }
  }
};
const handleUnpinMessage = async (messageId) => {
  try {
    // Gọi API để cập nhật trạng thái isPinned của tin nhắn thành false
    const response = await pinMessage(messageId, { isPinned: false });
    console.log("API Response (Unpin Message):", response);

    // Cập nhật state messages để phản ánh trạng thái bỏ ghim
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === messageId ? { ...msg, isPinned: false } : msg
      )
    );

    // Xóa tin nhắn đã ghim khỏi state pinnedMessage
    setPinnedMessage(null); // Sửa lỗi set về null
    // Có thể cần cập nhật selectedMessage nếu tin nhắn đã bỏ ghim là tin nhắn đang được chọn
    if (selectedMessage && selectedMessage._id === messageId) {
      setSelectedMessage(null);
    }

  } catch (error) {
    console.error("Lỗi khi bỏ ghim tin nhắn:", error);
    alert("Đã xảy ra lỗi khi bỏ ghim tin nhắn. Vui lòng thử lại.");
  }
};
 
  return (
    <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Image source={{ uri: otherUser.avatar || "https://randomuser.me/api/portraits/men/1.jpg" }} style={styles.avatar} />
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
        {/* Tin nhắn đã ghim */}
        {pinnedMessage && (
        <TouchableOpacity style={styles.pinnedMessageContainer}>
          <View style={styles.pinnedIndicator}>
            <MaterialIcons name="push-pin" size={16} color="red" />
            <Text style={styles.pinnedText}> Đã ghim</Text>
          </View>
          <Text style={styles.pinnedContent}>{pinnedMessage.text}</Text>
          <TouchableOpacity onPress={() => handleUnpinMessage(pinnedMessage._id)}>
            <Ionicons name="close-circle" size={18} color="gray" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
        {/* Preview */}
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


  {/* Chat */}
  <GiftedChat
   
    style={{ flexGrow: 1 }}
    messages={messages}
    onSend={ onSend}
    user={{ _id: currentUser._id }} // Replace with current user's id
    showUserAvatar={true}
    renderAvatar={renderCustomAvatar}
    text={text}
    onInputTextChanged={setText}
    renderMessageVideo={renderMessageVideo}
    renderMessageImage={renderMessageImage}
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
          <Ionicons name="send" size={24} color="#7B61FF" />
        </View>
      </Send>


    )}
    messagesContainerStyle={{ paddingBottom: 10 }}
  />


  {/* Emoji Picker */}
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

  {/* Message Options Modal */}
  <Modal
    animationType="slide"
    transparent={true}
    visible={isMessageModalVisible}
    onRequestClose={() => setIsMessageModalVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.modalOption} onPress={handlePinMessage}>
          <Text>Ghim tin nhắn</Text>
        </TouchableOpacity>
       
        <TouchableOpacity style={styles.modalOption} onPress={() => setIsMessageModalVisible(false)}>
          <Text>Hủy</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
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
    paddingBottom:20
},
actionButton: {
    marginHorizontal: 10,
},
sendButton: {
    padding: 10,
},
emojiPicker: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
},
emojiContainer: {
    position: "absolute",
    bottom: 0,
    width: 250,
    backgroundColor: "#fff",
    height: 250,
},
closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
},
messagesContainerStyle: {
  flex: 1,
  paddingBottom: 10, // Adds spacing at the bottom
},
bubbleWrapper: {
  marginVertical: 5, // Adds spacing between bubbles
},
seenText: {
  fontSize: 10,
  color: 'gray',
  alignSelf: 'flex-start',
  marginLeft: 20,
},
modalOverlay: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
modalContent: {
  backgroundColor: 'white',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
},
modalOption: {
  paddingVertical: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
  alignItems: 'center',
},
pinnedMessageContainer: {
  backgroundColor: 'lightyellow',
  padding: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottomWidth: 1,
  borderBottomColor: '#eee',
},
pinnedIndicator: {
  flexDirection: 'row',
  alignItems: 'center',
  marginRight: 10,
},
pinnedText: {
  fontSize: 12,
  color: 'gray',
  marginLeft: 5,
},
pinnedContent: {
  flex: 1,
  fontSize: 16,
},
})