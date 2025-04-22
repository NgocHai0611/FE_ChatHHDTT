import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Button,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from "react-native";
import {
  getListFriend,
  getFriendByPhone,
  createConversation,
  unfriend,
  checkFriendStatus,
  addFriend,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  cancelFriendRequest,
} from "../services/apiServices";
import * as ImagePicker from "expo-image-picker";
import Entypo from "@expo/vector-icons/Entypo";
import { CheckBox } from "react-native";
import axios from "axios";
import io from "socket.io-client";

const ModalAddUserToGroup = ({ visible, onClose, idUser, children }) => {
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [nameGroup, setNameGroup] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const socket = useRef(null); // Ref cho socket.io

  const toggleFriendSelection = (id) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // const handlePhoneBlur = async () => {
  //   if (!phoneNumber.trim()) return;

  //   try {
  //     const response = await axios.get(
  //       `http://192.168.2.20:8004/friends/search?phone=${phoneNumber}`
  //     );
  //     const user = response.data;

  //     const alreadyExists =
  //       friends.some((f) => f._id === user._id) ||
  //       selectedFriends.includes(user._id);

  //     if (!alreadyExists && user._id !== idUser) {
  //       setFriends((prev) => [...prev, user]);
  //       setSelectedFriends((prev) => [...prev, user._id]);
  //     } else {
  //       Alert.alert("Người dùng đã có trong danh sách hoặc bạn đã chọn rồi.");
  //     }
  //   } catch (error) {
  //     Alert.alert("Không tìm thấy người dùng với số điện thoại này.");
  //   }
  // };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Quyền truy cập bị từ chối",
        "Vui lòng cấp quyền truy cập thư viện ảnh."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  useEffect(() => {
    socket.current = io("http://192.168.2.20:8004", {
      transports: ["websocket"],
    });

    const fetchFriends = async () => {
      setLoading(true);
      try {
        const friendsList = await getListFriend(idUser);
        setFriends(friendsList);
      } catch (error) {
        console.error("Failed to fetch friends:", error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      fetchFriends();
    }

    return () => {
      socket.current.disconnect();
    };
  }, [idUser, visible]);

  const handleCreateGroupChat = async () => {
    if (!nameGroup.trim()) {
      Alert.alert("Vui lòng nhập tên nhóm.");
      return;
    }

    if (selectedFriends.length < 2) {
      Alert.alert("Cần chọn ít nhất 3 thành viên.");
      return;
    }
    const fullMemberList = [...new Set([...selectedFriends, idUser])]; // đảm bảo không trùng

    try {
      const formData = new FormData();
      formData.append("name", nameGroup);
      formData.append("isGroup", "true");
      formData.append("groupLeaderId", idUser);
      formData.append("members", JSON.stringify(fullMemberList));
      if (avatar) {
        formData.append(
          "groupAvatar",
          avatar ||
            "https://file.hstatic.net/200000503583/file/tao-dang-chup-anh-nhom-lay-loi__5__34b470841bb840e3b2ce25cbe02533ec.jpg"
        );
      }

      const response = await axios.post(
        "http://192.168.2.20:8004/conversations/createwithimage",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      socket.current.emit("createGroup", {
        conversationId: response.data._id,
        userId: idUser,
      });

      console.log("Tạo nhóm thành công!");
      setNameGroup("");
      setAvatar(null);
      setSelectedFriends([]);
      setPhoneNumber("");
      onClose();
    } catch (err) {
      console.error("Lỗi khi tạo nhóm:", err.response?.data || err.message);
      Alert.alert("Tạo nhóm thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.text}>{children}</Text>

          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Entypo name="image-inverted" size={24} color="black" />
          </TouchableOpacity>

          {avatar && (
            <Image source={{ uri: avatar }} style={styles.avatarPreview} />
          )}

          <TextInput
            placeholder="Nhập Tên Nhóm"
            style={styles.input}
            value={nameGroup}
            onChangeText={setNameGroup}
          />
          <TextInput
            placeholder="Nhập Số Điện Thoại Thêm Vào Nhóm"
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            // onBlur={handlePhoneBlur}
          />

          {friends.length > 0 ? (
            <View style={{ height: 300 }}>
              <FlatList
                data={friends}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.friendItem}>
                    <CheckBox
                      value={selectedFriends.includes(item._id)}
                      onValueChange={() => toggleFriendSelection(item._id)}
                    />
                    <Image
                      source={{ uri: item.avatar }}
                      style={styles.friendAvatar}
                    />
                    <Text style={styles.friendName}>{item.username}</Text>
                  </View>
                )}
                ListHeaderComponent={() => (
                  <Text style={{ fontWeight: "bold", marginBottom: 5 }}>
                    Chọn bạn bè thêm vào nhóm:
                  </Text>
                )}
              />
            </View>
          ) : (
            <Text>Không có bạn bè nào để thêm vào nhóm.</Text>
          )}

          <View style={styles.buttonRow}>
            <Button title="Tạo Nhóm" onPress={handleCreateGroupChat} />
            <Button title="Đóng" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ModalAddUserToGroup;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    width: 360,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  text: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  editIcon: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "#eee",
    padding: 8,
    borderRadius: 20,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderColor: "#ccc",
    borderWidth: 1,
    alignSelf: "center",
  },
  input: {
    width: "100%",
    height: 45,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginVertical: 8,
    backgroundColor: "#f8f8f8",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 10,
    backgroundColor: "#ddd",
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
