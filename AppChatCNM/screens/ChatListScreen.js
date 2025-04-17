import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  SafeAreaView,
  Modal,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getConversations, getUserById } from "../services/apiServices";
import { io } from "socket.io-client";
import dayjs from "dayjs";
import { SwipeListView } from "react-native-swipe-list-view";

export default function ChatListScreen({ navigation }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [searchText, setSearchText] = useState("");
  const socket = io("http://192.168.100.60:8004", {
    transports: ["websocket"],
  });
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  // Fetch thông tin user khi đăng nhập
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          const updatedUser = await getUserById(parsedUser._id);
          setUser(updatedUser);
          await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (error) {
        console.log("Error retrieving user data", error);
      }
    };
    fetchUserData();
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    if (user) {
      try {
        const data = await getConversations(user._id);
        setConversations(data);
        console.log("Fetched Conversations:", data);
      } catch (error) {
        console.log("Error fetching conversations:", error);
      }
    }
  };

  // Call các cuộc trò chuyện when user changes
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Socket Listener
  useEffect(() => {
    socket.on("conversationUpdated", () => {
      if (user) fetchConversations();
    });

    socket.on("chatDeleted", (data) => {
      setConversations((prevConversations) =>
        prevConversations.filter((conv) => conv._id !== data.conversationId)
      );
      console.log("Chat deleted on client:", data.conversationId);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const filteredConversations = conversations.filter((c) => {
    
    
    const hasValidMessage = c.latestmessage && c.latestmessage.trim() !== "";
    const hasValidMembers = c.members && c.members.length > 0;

    return (
      hasValidMessage &&
      hasValidMembers &&
      (c.latestmessage.toLowerCase().includes(searchText.toLowerCase()) ||
        c.members.join(" ").toLowerCase().includes(searchText.toLowerCase()))
    );
  });

  console.log("Filtered Conversations:", filteredConversations);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const formatMessageTime = (timestamp) => {
    const now = dayjs();
    const messageTime = dayjs(timestamp);
    const diffMinutes = now.diff(messageTime, "minute");
    const diffHours = now.diff(messageTime, "hour");
    const diffDays = now.diff(messageTime, "day");

    if (diffMinutes < 1) {
      return "Vừa xong";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} phút`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ`;
    } else if (diffDays === 1) {
      return "Hôm qua";
    } else if (diffDays <= 7) {
      return `${diffDays} ngày`;
    } else {
      return messageTime.format("DD/MM/YYYY");
    }
  };

  const handleConversationClick = (conversation, otherMember) => {
    socket.emit("markAsSeen", {
      conversationId: conversation._id,
      userId: user._id,
    });
    navigation.navigate("ChatScreen", {
      conversation: conversation,
      currentUser: user,
      otherUser: otherMember,
    });
  };

  const handleDeleteChat = (conversationId) => {
    setSelectedConversationId(conversationId);
    setDeleteModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      // Xóa dữ liệu trong AsyncStorage
      await AsyncStorage.removeItem("user");

      // Ngắt kết nối socket
      socket.disconnect();

      // Reset toàn bộ trạng thái điều hướng và chuyển đến màn hình Login
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("Error during logout:", error);
      Alert.alert("Lỗi", "Đăng xuất thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Phần Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
          <Text style={styles.username}>{user.username}</Text>
        </View>
        <Text style={styles.title}>Chats</Text>
      </View>

      {/* Phần body */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.iconAddFriend}>
          <MaterialIcons name="person-add" size={30} color="gray" />
        </TouchableOpacity>
        <View style={styles.iconSearch}>
          <TouchableOpacity style={styles.iconSearchTouch}>
            <FontAwesome
              name="search"
              size={20}
              color="gray"
              style={styles.icon}
            />
            <TextInput
              placeholder="Search"
              style={styles.input}
              placeholderTextColor="#000"
              value={searchText}
              onChangeText={setSearchText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Phần hiển thị danh sách cuộc trò chuyện */}
      <SwipeListView
        data={filteredConversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const otherMember = item.members.find(
            (member) => member._id !== user._id
          );
          const lastMessageTime = formatMessageTime(item.lastMessageTime);
          const isLastMessageFromCurrentUser =
            item.lastMessageSenderId === user._id;
          const unreadCountObject = item.unreadCounts.find(
            (uc) => uc.userId === user._id
          );
          const unreadCount = unreadCountObject ? unreadCountObject.count : 0;

          return (
            <TouchableOpacity
              style={[
                styles.chatItem,
                hoveredId === item._id && styles.chatItemHover,
              ]}
              onPressIn={() => setHoveredId(item._id)}
              onPressOut={() => setHoveredId(null)}
              onPress={() => handleConversationClick(item, otherMember)}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: otherMember.avatar }}
                  style={styles.chatAvatar}
                />
                {item.isOnline && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.chatDetails}>
                <View style={styles.chatInfo}>
                  <Text style={styles.name}>{otherMember.username}</Text>
                  <Text style={styles.lastMessage}>
                    {isLastMessageFromCurrentUser
                      ? `Bạn: ${item.latestmessage}`
                      : item.latestmessage}
                  </Text>
                </View>
                <Text style={styles.chatTime}>{lastMessageTime}</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        renderHiddenItem={({ item }) => (
          <View style={styles.rowBack}>
            <View style={{ flex: 1 }}></View>
            <TouchableOpacity
              style={[styles.backRightBtn, styles.backRightBtnRight]}
              onPress={() => handleDeleteChat(item._id)}
            >
              <Text style={styles.backTextWhite}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
        leftOpenValue={0}
        rightOpenValue={-75}
      />

      {/* Modal xóa */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => {
          setDeleteModalVisible(!isDeleteModalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              Bạn có chắc chắn muốn xóa cuộc trò chuyện này?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setDeleteModalVisible(!isDeleteModalVisible)}
              >
                <Text style={styles.textStyle}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonDelete]}
                onPress={() => {
                  if (selectedConversationId) {
                    socket.emit("deleteChat", {
                      conversationId: selectedConversationId,
                    });
                  }
                  setDeleteModalVisible(!isDeleteModalVisible);
                  setSelectedConversationId(null);
                }}
              >
                <Text style={styles.textStyle}>Xóa</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phần menu footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.iconFooter}>
          <MaterialIcons name="chat" size={30} color="#b73bff" />
          <Text style={styles.textFooter}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconFooter}
          onPress={() => {
            navigation.navigate("PhoneContact", { currentUser: user });
          }}
        >
          <MaterialIcons name="contacts" size={30} color="gray" />
          <Text style={styles.textFooter}>Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconFooter}>
          <MaterialIcons name="group" size={30} color="gray" />
          <Text style={styles.textFooter}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconFooter}
          onPress={() => {
            navigation.navigate("EditProfileScreen", { user });
          }}
        >
          <MaterialIcons name="person" size={30} color="gray" />
          <Text style={styles.textFooter}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconFooter} onPress={handleLogout}>
          <MaterialIcons name="logout" size={30} color="gray" />
          <Text style={styles.textFooter}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  unreadBadge: {
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginLeft: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 15,
    borderTopWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  iconAddFriend: {},
  iconSearch: {
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    width: "90%",
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 20,
  },
  iconSearchTouch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
  },
  chatItemHover: {
    backgroundColor: "#f0f0f0",
  },
  avatarContainer: {
    position: "relative",
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "green",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginLeft: 15,
    flex: 1,
  },
  chatInfo: {
    flexDirection: "column",
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
  },
  lastMessage: {
    fontSize: 14,
    color: "gray",
  },
  footer: {
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  textFooter: {
    fontSize: 12,
    color: "gray",
    textAlign: "center",
  },
  iconFooter: {
    alignItems: "center",
  },
  messageTime: {
    fontSize: 12,
    color: "#888",
    marginLeft: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginHorizontal: 5,
  },
  buttonCancel: {
    backgroundColor: "#d3d3d3",
  },
  buttonDelete: {
    backgroundColor: "#ff6347",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  rowBack: {
    alignItems: "center",
    backgroundColor: "#DDD",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 15,
  },
  backRightBtn: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    position: "absolute",
    top: 0,
    width: 75,
  },
  backRightBtnRight: {
    backgroundColor: "red",
    right: 0,
  },
  backTextWhite: {
    color: "#FFF",
  },
});
