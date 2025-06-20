// src/services/apiService.ts
import api from "./api"; // Giả sử bạn đã cấu hình axios trong file api.ts hoặc api.js
import { io } from "socket.io-client";

// Địa chỉ server Socket.IO (thay đổi nếu cần)
const SOCKET_URL = "https://bechatcnm-production.up.railway.app";

// Khởi tạo kết nối Socket.IO
let socket = null;

export const initializeSocket = (userId, onFriendRequestReceived) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server:", socket.id);
      // Tham gia phòng của userId
      socket.emit("join_room", userId);
    });

    socket.on("new_friend_request", async (request) => {
      console.log("New friend request received:", request);
      try {
        // Lấy thông tin người gửi
        const sender = await getUserById(request.senderId);
        const populatedRequest = {
          ...request,
          senderId: {
            _id: request.senderId,
            username: sender.username,
            avatar: sender.avatar,
          },
        };
        if (onFriendRequestReceived) {
          onFriendRequestReceived(populatedRequest);
        }
      } catch (error) {
        console.error("Error populating sender info:", error);
        if (onFriendRequestReceived) {
          onFriendRequestReceived(request); // Fallback to original request if error
        }
      }
    });

    socket.on("friend_request_accepted", async (request) => {
      if (onFriendRequestReceived) {
        onFriendRequestReceived(request);
      }
    });

    socket.on("friend_request_rejected", (data) => {
      if (onFriendRequestReceived) {
        onFriendRequestReceived(data);
      }
    });

    socket.on("friend_request_cancelled", (data) => {
      if (onFriendRequestReceived) {
        onFriendRequestReceived(data);
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket.IO disconnected");
  }
};
export const getSocket = () => socket;


// Fetch updated user data
export const fetchUpdatedUser = async (userId) => {
  try {
    const response = await api.get(`/users/get/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching updated user:", error);
    throw error;
  }
};

// Fetch updated friend list and requests
export const fetchUpdatedFriendData = async (userId) => {
  try {
    const [friends, requests] = await Promise.all([
      api.get(`/friends/getfriend/${userId}`),
      api.get(`/friends/friend-requests/${userId}`),
    ]);
    return {
      friends: friends.data,
      requests: requests.data,
    };
  } catch (error) {
    console.error("Error fetching updated friend data:", error);
    throw error;
  }
};

//Hiển thị danh sách cuộc trò chuyện
export const getConversations = async (userId) => {
  const response = await api.get(`/conversations/${userId}/search`);
  return response.data;
};
//Lấy All tin nhắn của cuộc trò chuyện
export const getMessages = async (conversationId) => {
  try {
    const response = await api.get(`/messages/get/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

// Lấy thông tin người dùng theo ID
export const getUserById = async (userId) => {
  try {
    const response = await api.get(`/users/get/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const updateUser = async (userId, data) => {
  const response = await api.put(`/users/update/${userId}`, data);
  return response.data;
};

// Gửi tin nhắn
export const sendMessages = async (
  conversationId,
  senderId,
  messageType,
  text,
  imageUrl = "",
  videoUrl = "",
  fileUrl = "",
  fileName = "",
  iconCode = "",
  replyTo = null
) => {
  const messageData = {
    conversationId,
    senderId,
    messageType,
    text,
    imageUrl,
    videoUrl,
    fileUrl,
    fileName,
    iconCode,
    replyTo,
  };

  try {
    const response = await api.post("/messages/create", messageData);
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

//Get List Friend
export const getListFriend = async (userId) => {
  try {
    const response = await api.get(`/friends/getfriend/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

//Tim kiem ban be
export const getFriendByPhone = async (phone) => {
  try {
    const response = await api.get(`/friends/search`, {
      params: { phone },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

//Tạo cuộc trò chuyện
export const createConversation = async (members) => {
  try {
    const response = await api.post("/conversations/create", {
      members, // Danh sách ID của 2 người tham gia
      isGroup: false, // Chat cá nhân
      name: "", // Không cần tên
      groupAvatar: "", // Không cần avatar nhóm
    });

    console.log("Conversation created successfully:", response.data);
    return response.data; // Trả về dữ liệu cuộc trò chuyện
  } catch (error) {
    console.error(
      "Error creating conversation:",
      error.response?.data || error.message
    );
    throw error; // Ném lỗi để xử lý tiếp
  }
};

// Ghim tin nhắn
export const pinMessage = async (messageId, data) => {
  try {
    const response = await api.put(`/messages/pin/${messageId}`, data);
    return response.data; // Trả về dữ liệu phản hồi từ API (nếu có)
  } catch (error) {
    console.error("Lỗi khi ghim tin nhắn:", error);
    throw error; // Ném lỗi để component gọi hàm có thể xử lý
  }
};

// Hủy kết bạn
export const unfriend = async (userId, friendId) => {
  try {
    const response = await api.post("/friends/unfriend", {
      userId,
      friendId,
    });
    console.log("Hủy kết bạn thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi hủy kết bạn:",
      error.response?.data || error.message
    );
    throw error;
  }
};

//Kiểm tra trạng thái bạn bè
export const checkFriendStatus = async (userId, friendId) => {
  try {
    const response = await api.get(
      `/friends/checkfriend/${userId}/${friendId}`
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi khi kiểm tra trạng thái bạn bè:", error);
    throw error;
  }
};

// Gửi yêu cầu kết bạn
export const addFriend = async (senderId, receiverId) => {
  try {
    const response = await api.post("/friends/send-request", {
      senderId,
      receiverId,
    });
    console.log("Gửi yêu cầu kết bạn thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi gửi yêu cầu kết bạn:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Từ chối yêu cầu kết bạn
export const rejectFriendRequest = async (requestId) => {
  try {
    const response = await api.post("/friends/reject-request", {
      requestId,
    });
    console.log("Từ chối yêu cầu kết bạn thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi từ chối yêu cầu kết bạn:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Hủy yêu cầu kết bạn (người gửi hủy)
export const cancelFriendRequest = async (receiverId, senderId) => {
  try {
    const response = await api.post("/friends/cancel-request", {
      senderId,
      receiverId,
    });
    console.log("Hủy yêu cầu kết bạn thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi hủy yêu cầu kết bạn:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Lấy danh sách yêu cầu kết bạn
export const getFriendRequests = async (userId) => {
  try {
    const response = await api.get(`/friends/friend-requests/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu kết bạn:", error);
    throw error;
  }
};

// Chấp nhận yêu cầu kết bạn
export const acceptFriendRequest = async (requestId) => {
  try {
    const response = await api.post("/friends/accept-request", {
      requestId,
    });
    console.log("Chấp nhận yêu cầu kết bạn thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi chấp nhận yêu cầu kết bạn:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Hàm call API thu hồi tin nhắn
export const recallMessage = async (messageId, conversationId) => {
  try {
    const response = await api.put(`/messages/recall/${messageId}`, {
      conversationId,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi thu hồi tin nhắn:", error);
    throw error;
  }
};

// Xóa tin nhắn ở phía người tôi
export const deleteMessageForUser = async (
  messageId,
  userId,
  conversationId
) => {
  try {
    const response = await api.put(`/messages/deletefrom/${messageId}`, {
      userId,
      conversationId,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi xóa tin nhắn ở phía người dùng:", error);
    throw error;
  }
};

// Hàm upload file, video, image nhiều file được

export const uploadFiles = async (files, conversationId, senderId) => {
  try {
    const formData = new FormData();

    // Danh sách MIME type hợp lệ, khớp với backend
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "video/mp4",
      "video/quicktime",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/x-zip-compressed",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    for (const file of files) {
      console.log("Processing file:", file);
      if (!file.uri || !file.name || !file.type) {
        console.error("Invalid file data:", file);
        throw new Error("Invalid file data");
      }
      if (!validMimeTypes.includes(file.type)) {
        console.error("Unsupported MIME type:", file.type);
        throw new Error(`Loại file không được hỗ trợ: ${file.type}`);
      }

      if (file.uri.startsWith("data:")) {
        const base64String = file.uri.split(",")[1];
        const mimeType = file.type;
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        formData.append("files", blob, file.name);
      } else {
        formData.append("files", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        });
      }
    }

    formData.append("conversationId", conversationId);
    formData.append("senderId", senderId);

    if (__DEV__) {
      for (const [key, value] of formData.entries()) {
        console.log(`FormData entry: ${key}=`, value);
      }
    }

    const response = await api.post("/messages/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    console.log("Upload response:", response.data);
    if (!response.data || typeof response.data !== "object") {
      throw new Error("Invalid server response");
    }
    return response.data;
  } catch (error) {
    console.error(
      "Lỗi khi tải lên files:",
      error.response?.data || error.message
    );
    throw error;
  }
};