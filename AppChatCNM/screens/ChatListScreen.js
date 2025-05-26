import React, { useState, useEffect, useMemo, useCallback,useRef } from "react";
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
  RefreshControl,
} from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getConversations, getUserById, getFriendRequests, initializeSocket, disconnectSocket,getSocket } from "../services/apiServices";
import { io } from "socket.io-client";
import dayjs from "dayjs";
import { SwipeListView } from "react-native-swipe-list-view";
import axios from "axios";
import ModalAddUserToGroup from "./ModelAddUserGroup";
import { useFocusEffect } from "@react-navigation/native";
 
export default function ChatListScreen({ navigation, route }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [pendingFriendRequests, setPendingFriendRequests] = useState(0);
  // const socket = io("https://bechatcnm-production.up.railway.app", {
  //   transports: ["websocket"],
  // });
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(true);
  const [modalAction, setModalAction] = useState("hide");
  const [refreshing, setRefreshing] = useState(false);
const socketRef = useRef(null);
  // Kiểm tra và cập nhật user từ route.params
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Kiểm tra nếu có updatedUser từ route.params (từ EditProfileScreen)
        if (route.params?.updatedUser) {
          setUser(route.params.updatedUser);
          await AsyncStorage.setItem("user", JSON.stringify(route.params.updatedUser));
        } else {
          // Nếu không có updatedUser, lấy từ AsyncStorage
          const userData = await AsyncStorage.getItem("user");
          if (userData) {
            const parsedUser = JSON.parse(userData);
            const updatedUser = await getUserById(parsedUser._id);
            setUser(updatedUser);
            await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error("Error retrieving user data", error);
      }
    };
    fetchUserData();
  }, [route.params?.updatedUser]);

  // Polling for current user's data (avatar and username) every 2 seconds
  useEffect(() => {
    if (!user?._id) return;

    const pollUserData = async () => {
      try {
        const updatedUser = await getUserById(user._id);
        setUser((prevUser) => ({
          ...prevUser,
          username: updatedUser.username,
          avatar: updatedUser.avatar,
        }));
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      } catch (error) {
        console.error("Error polling user data:", error);
      }
    };

    const interval = setInterval(pollUserData, 5000); // Poll every 2 seconds

    // Initial fetch
    pollUserData();

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [user?._id]);

  // Fetch friend requests
  const fetchFriendRequests = useCallback(async () => {
    if (user?._id) {
      try {
        const requests = await getFriendRequests(user._id);
        setPendingFriendRequests(requests.length);
      } catch (error) {
        console.error("Error fetching friend requests:", error);
        throw error;
      }
    }
  }, [user]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (user) {
      try {
        const data = await getConversations(user._id);
        const filteredData = data.filter(
          (conv) => !conv.deleteBy?.some((id) => id.toString() === user._id.toString())
        );
        setConversations(filteredData);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }
    }
  }, [user]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchConversations(), fetchFriendRequests()]);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải lại dữ liệu. Vui lòng thử lại.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchConversations, fetchFriendRequests]);

  // Fetch data when user changes or screen is focused
  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchFriendRequests();
    }
  }, [user, fetchConversations, fetchFriendRequests]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchConversations();
        fetchFriendRequests();
      }
    }, [user, fetchConversations, fetchFriendRequests])
  );

  // Socket.IO setup
  useEffect(() => {
    if (user?._id) {
      socketRef.current = initializeSocket(user._id, (request) => {
        setPendingFriendRequests((prev) => prev + 1);
      });

      socketRef.current.on("conversationUpdated", () => {
        if (user) fetchConversations();
      });

      socketRef.current.on("chatDeleted", ({ conversationId }) => {
        setConversations((prevConversations) =>
          prevConversations.filter((conv) => conv._id !== conversationId)
        );
      });

      socketRef.current.on("connect_error", (err) => {
        Alert.alert("Lỗi kết nối", "Không thể kết nối đến server Socket.IO.");
      });

      return () => {
       socketRef.current.off("conversationUpdated");
        socketRef.current.off("chatDeleted");
        socketRef.current.off("connect_error");
        // disconnectSocket();
      };
    }
  }, [user, fetchConversations]);

  const filteredConversations = useMemo(() => {
    return conversations
      .filter((c) => {
        const hasLatestMessage = c.latestmessage !== undefined && c.latestmessage !== null;
        const hasValidMembers = c.members && c.members.length > 0;
        const isLastMessageRecalled = c.isLastMessageRecalled || false;

        const shouldShowConversation =
          hasValidMembers &&
          ((hasLatestMessage &&
            (isLastMessageRecalled ||
              c.latestmessage.trim() !== "" ||
              c.latestMessageType !== "text")) ||
            c.members
              .join(" ")
              .toLowerCase()
              .includes(searchText.toLowerCase()));

        const isNotHiddenOrDeleted = !c.deleteBy?.includes(user._id);
        return shouldShowConversation && isNotHiddenOrDeleted;
      })
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
  }, [conversations, searchText]);

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

  const fetchMessagesByConversationId = async (conversationId) => {
    try {
      const response = await fetch(
        `https://bechatcnm-production.up.railway.app/messages/get/${conversationId}`
      );
      const data = await response.json();
      const pinnedMessage = data.find((msg) => msg.isPinned === true);
      setPinnedMessage(pinnedMessage);
      return data;
    } catch (error) {
      console.error("Lỗi khi lấy messages:", error);
      return [];
    }
  };

  const handleConversationClick = async (conversation, otherMember) => {
    try {
      const messages = await fetchMessagesByConversationId(conversation._id);
      let createGroupData = null;

      const res1 = await axios.get(
        `https://bechatcnm-production.up.railway.app/conversations/get/${conversation._id}`
      );
      const fullConversation = res1.data;

      if (fullConversation.createGroup?.userId) {
        const res2 = await axios.get(
          `https://bechatcnm-production.up.railway.app/users/get/${fullConversation.createGroup.userId}`
        );
        const userAdd = res2.data;

        createGroupData = {
          conversationId: conversation._id,
          userId: userAdd._id,
          username: userAdd.username,
          lastMessageId: fullConversation.createGroup.lastMessageId,
        };
      }
      const socket = getSocket();

      if (socket) {
        socket.emit("markAsSeen", {
          conversationId: conversation._id,
          userId: user._id,
        });

        if (conversation.lastMessageSenderId !== user._id) {
          socket.emit("messageSeen", {
            messageId: conversation.lastMessageId,
            userId: user._id,
          });
        }
      } else {
        console.warn("Socket is not initialized");
      }

      navigation.navigate("ChatScreen", {
        conversation: {
          ...conversation,
          ...(createGroupData && { createGroup: createGroupData }),
        },
        currentUser: user,
        otherUser: otherMember,
        messages: messages,
      });
    } catch (error) {
      console.error("Lỗi khi chọn đoạn chat:", error);
      Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  const handleDeleteChat = (conversationId) => {
    setSelectedConversationId(conversationId);
    setModalAction("hide");
    setDeleteModalVisible(true);
  };

  const handleDeleteChatWithMe = (conversationId) => {
    setSelectedConversationId(conversationId);
    setModalAction("delete");
    setDeleteModalVisible(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      disconnectSocket();
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
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
          <Text style={styles.username}>{user.username}</Text>
        </View>
        <View>
          <Text style={styles.title}>Chats</Text>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.iconAddFriend}>
          <MaterialIcons
            name="group-add"
            size={24}
            color="black"
            onPress={() => setModalVisible(true)}
          />
        </TouchableOpacity>
        <View style={styles.iconSearch}>
          <TouchableOpacity style={styles.iconSearchTouch}>
            <FontAwesome name="search" size={20} color="gray" style={styles.icon} />
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

      <SwipeListView
        data={filteredConversations}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const isGroupChat = item.isGroup;
          const otherMember = !isGroupChat
            ? item.members.find((member) => member._id !== user._id)
            : null;

          const avatarSource = isGroupChat
            ? {
                uri:
                  item.groupAvatar ||
                  "https://file.hstatic.net/200000503583/file/tao-dang-chup-anh-nhom-lay-loi__5__34b470841bb840e3b2ce25cbe02533ec.jpg",
              }
            : {
                uri:
                  otherMember?.avatar ||
                  "https://res.cloudinary.com/dkmwjkajj/image/upload/v1744086751/rdlye9nsldaprn40ozmd.jpg",
              };

          const lastMessageTime = formatMessageTime(item.lastMessageTime);
          const isLastMessageFromCurrentUser = item.lastMessageSenderId === user._id;
          const unreadCountObject = item.unreadCounts.find(
            (uc) => uc.userId === user._id
          );
          const unreadCount = unreadCountObject ? unreadCountObject.count : 0;

          return (
            <TouchableOpacity
              style={[styles.chatItem, hoveredId === item._id && styles.chatItemHover]}
              onPressIn={() => setHoveredId(item._id)}
              onPressOut={() => setHoveredId(null)}
              onPress={() => handleConversationClick(item, otherMember)}
            >
              <View style={styles.avatarContainer}>
                <Image source={avatarSource} style={styles.chatAvatar} />
                {!isGroupChat && item.isOnline && (
                  <View style={styles.onlineIndicator} />
                )}
              </View>
              <View style={styles.chatDetails}>
                <View style={styles.chatInfo}>
                  <Text style={styles.name}>
                    {isGroupChat ? item.name : otherMember?.username}
                  </Text>
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
              style={[styles.backRightBtn, styles.backRightBtnHide]}
              onPress={() => handleDeleteChat(item._id)}
            >
              <Text style={styles.backTextWhite}>Ẩn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.backRightBtn, styles.backRightBtnRight]}
              onPress={() => handleDeleteChatWithMe(item._id)}
            >
              <Text style={styles.backTextWhite}>Xóa</Text>
            </TouchableOpacity>
          </View>
        )}
        leftOpenValue={0}
        rightOpenValue={-150}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={isDeleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>
              {modalAction === "hide"
                ? "Bạn có chắc muốn ẩn đoạn chat này?"
                : "Bạn có chắc muốn xóa đoạn chat này?"}
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.button, styles.buttonCancel]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.textStyle}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  modalAction === "hide" ? styles.buttonHide : styles.buttonDelete,
                ]}
                onPress={() => {
                  const socket = getSocket();
                  if (socket && selectedConversationId) {
                    if (modalAction === "hide") {
                      socket.emit("deleteChat", {
                        conversationId: selectedConversationId,
                        userId: user._id,
                      });
                    } else {
                      socket.emit("deleteChatWithMe", {
                        conversationId: selectedConversationId,
                        userId: user._id,
                      });
                    }
                  }
                  setDeleteModalVisible(false);
                  setSelectedConversationId(null);
                }}
              >
                <Text style={styles.textStyle}>{modalAction === "hide" ? "Ẩn" : "Xóa"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.iconFooter}>
          <MaterialIcons name="chat" size={30} color="#b73bff" />
          <ModalAddUserToGroup
            idUser={user._id}
            visible={isModalVisible}
            typeAction={"create"}
            onClose={() => {
              setModalVisible(false);
              setRefreshFlag((prev) => !prev);
            }}
            existingMembers={[]}
          >
            Tạo Nhóm
          </ModalAddUserToGroup>
          <Text style={styles.textFooter}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconFooter}
          onPress={() => {
            navigation.navigate("PhoneContact", { currentUser: user });
            setPendingFriendRequests(0); // Reset badge when navigating to Contacts
          }}
        >
          <View style={styles.iconWrapper}>
            <MaterialIcons name="contacts" size={30} color="gray" />
            {pendingFriendRequests > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{pendingFriendRequests}</Text>
              </View>
            )}
          </View>
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
  iconWrapper: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
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
    backgroundColor: "rgba(0,0,0,0.5)",
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
  buttonHide: {
    backgroundColor: "#FFA500",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  rowBack: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backRightBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    width: 75,
  },
  backRightBtnHide: {
    backgroundColor: "#FFA500",
  },
  backRightBtnRight: {
    backgroundColor: "#FF0000",
  },
  backTextWhite: {
    color: "#FFF",
    fontWeight: "bold",
  },
  systemMessageText: {
    fontStyle: "italic",
    color: "gray",
    textAlign: "center",
  },
});