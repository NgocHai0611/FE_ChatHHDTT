// src/services/apiService.ts
import api from './api'; // Giả sử bạn đã cấu hình axios trong file api.ts hoặc api.js

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
        throw error; // Propagate error to caller
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
  imageUrl = '',
  videoUrl = '',
  fileUrl = '',
  fileName = '',
  iconCode = '',
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
    const response = await api.post('/messages/create', messageData);
    return response.data; // Trả về dữ liệu tin nhắn đã được gửi thành công
  } catch (error) {
    console.error('Error sending message:', error);
    throw error; // Propagate error to caller
  }
};

//Get List Friend
export const getListFriend = async (userId) => {
  try {
      const response = await api.get(`/friends/getfriend/${userId}`);
      return response.data;
  } catch (error) {
      console.error("Error fetching messages:", error);
      throw error; // Propagate error to caller
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
    console.error("Lỗi khi tìm kiếm bạn bè:", error);
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
    console.error("Error creating conversation:", error.response?.data || error.message);
    throw error; // Ném lỗi để xử lý tiếp
  }
};


// Ghim tin nhắn
export const pinMessage = async (messageId, data) => {
  try {
    const response = await api.put(`/messages/pin/${messageId}`,data);
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
    return response.data; // Trả về dữ liệu phản hồi từ API
  } catch (error) {
    console.error("Lỗi khi hủy kết bạn:", error.response?.data || error.message);
    throw error; // Ném lỗi để component gọi hàm có thể xử lý
  }
};


//Kiểm tra trạng thái bạn bè
export const checkFriendStatus = async (userId, friendId) => {
  try {
      const response = await api.get(`/friends/checkfriend/${userId}/${friendId}`);
      return response.data;
  } catch (error) {
      console.error("Lỗi khi kiểm tra trạng thái bạn bè:", error);
      throw error;
  }
};

// Gửi yêu cầu kết bạn
export const addFriend = async (senderId, receiverId) => {
  try {
      const response = await api.post('/friends/send-request', {
          senderId,
          receiverId,
      });
      console.log("Gửi yêu cầu kết bạn thành công:", response.data);
      return response.data;
  } catch (error) {
      console.error("Lỗi khi gửi yêu cầu kết bạn:", error.response?.data || error.message);
      throw error;
  }
};
// Từ chối yêu cầu kết bạn
export const rejectFriendRequest = async (requestId) => {
  try {
      const response = await api.post('/friends/reject-request', {
          requestId,
      });
      console.log("Từ chối yêu cầu kết bạn thành công:", response.data);
      return response.data;
  } catch (error) {
      console.error("Lỗi khi từ chối yêu cầu kết bạn:", error.response?.data || error.message);
      throw error;
  }
};

// Hủy yêu cầu kết bạn (người gửi hủy)
// Hủy yêu cầu kết bạn (người gửi hủy)
export const cancelFriendRequest = async (receiverId, senderId) => { // Chắc chắn có senderId ở đây
  try {
    const response = await api.post('/friends/cancel-request', {
      senderId,
      receiverId,
    });
    console.log("Hủy yêu cầu kết bạn thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi hủy yêu cầu kết bạn:", error.response?.data || error.message);
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
export const acceptFriendRequest = async (requestId, senderId, receiverId) => {
  try {
      const response = await api.post('/friends/accept-request', {
          requestId,
          senderId,
          receiverId,
      });
      console.log("Chấp nhận yêu cầu kết bạn thành công:", response.data);
      return response.data;
  } catch (error) {
      console.error("Lỗi khi chấp nhận yêu cầu kết bạn:", error.response?.data || error.message);
      throw error;
  }
};