import { React, useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client";
import {
  FaPaperPlane,
  FaSearch,
  FaPhone,
  FaVideo,
  FaStarHalfAlt,
  FaExclamationCircle,
  FaEllipsisV,
  FaComments,
  FaUsers,
  FaPaperclip,
  FaMicrophone,
  FaImage,
  FaSmile,
  FaClock,
  FaCheck,
  FaTimes,
  FaAddressBook,
  FaCog,
  FaUser,
  FaUserPlus,
  FaUserCheck, // Icon Groups
  FaEllipsisH, // Icon More
  FaCamera,
  FaEye, FaEyeSlash
} from "react-icons/fa";


import "./chatApp.css";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FiTrash2 } from "react-icons/fi"; // Thùng rác nét mảnh, hiện đại

import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { set } from "mongoose";
// import { image } from "../../../../../BE_ChatHHDTT/config/cloudConfig";
const socket = io("http://localhost:8004", { transports: ["websocket"] });

Modal.setAppElement("#root");

export default function ChatApp() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [sidebarView, setSidebarView] = useState("chat-list"); // Mặc định hiển thị danh sách chat
  const [selectedHeader, setSelectedHeader] = useState("");
  const navigate = useNavigate();
  const messageRefs = useRef({});
  
  dayjs.extend(relativeTime);
  dayjs.locale("vi");
  const [selectedtitle, setSelectedTitle] = useState(
    "Chào mừng bạn đến với ứng dụng chat! "
  );
  const [selectedtitle2, setSelectedTitle2] = useState(
    "Chào mừng bạn đến với ứng dụng chat! "
  );
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null); // Tham chiếu đến menu
  const friendMenuRef = useRef(null); // Tham chiếu đến menu xóa bạn
  const friendRef = useRef(null); // Tham chiếu đến phần tử bạn
  

  const location = useLocation();
  const user = location.state?.user; // Lấy user truyền từ navigate

  //Update user
  const [showModal, setShowModal] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [updatedUser, setUpdatedUser] = useState({
    username: '',
    phone: '',
    password: '',
    avatar: ''
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [inputText, setInputText] = useState("");
  const inputRef = useRef(null);
  const [isFriendRequestSent, setIsFriendRequestSent] = useState(false);

  const [friendRequests, setFriendRequests] = useState([]); //Lưu danh sách lời mời kết bạn
  const [showFriendRequests, setShowFriendRequests] = useState(false); // Hiển thị ds lời mời kết bạn
  const [friends, setFriends] = useState([]); // Lưu danh sách bạn bè
  const [selectedFriend, setSelectedFriend] = useState(null);// xóa bạn bè
  const [chatSearch, setChatSearch] = useState([]);

  

  console.log(user);

  const [chats, setChats] = useState([]);

  { /* Lấy danh sách conversation từ server và cập nhật vào state */ }
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Bước 1: Lấy danh sách conversation
        const res = await axios.get(
          `http://localhost:8004/conversations/${user._id}`
        );
        let conversations = res.data;
        console.log(`conversations trc khi lọc`, conversations);
        // Bước 2: Lọc bỏ conversations có messages rỗng
        conversations = conversations.filter(conv => conv.messages.length > 0);
        console.log(`conversations sau khi lọc`, conversations);
    
        const chatPromises = conversations.map(async (conv) => {
          // Bước 2: Lấy userId từ members (trừ currentUser)
          const otherUserId = conv.members.find((_id) => _id !== user._id);
          const unreadCountForUser =
            conv.unreadCounts.find(
              (item) => item.userId.toString() === user._id.toString()
            )?.count || 0;
          console.log("unreadCountForUser", unreadCountForUser);

          // Bước 3: Gọi API lấy thông tin user
          const userRes = await axios.get(
            `http://localhost:8004/users/get/${otherUserId}`
          );
          const otherUser = userRes.data;
          return {
            conversationId: conv._id,
            lastMessageSenderId: conv.lastMessageSenderId,
            lastMessageId: conv.lastMessageId,
            name: conv.isGroup ? conv.name : otherUser.username,
            image: conv.isGroup ? conv.groupAvatar : otherUser.avatar,
            lastMessage: conv.latestmessage || "",
            timestamp: conv.updatedAt,
            active: otherUser.isOnline,
            unreadCount: unreadCountForUser,
            lastMessageTime: conv.lastMessageTime,
          };
        });
        console.log("message", messages);
        // Chờ tất cả promises hoàn thành
        const chatList = await Promise.all(chatPromises);
        setChats(chatList);
        console.log(chatList);
      } catch (err) {
        console.error(err);
      }
    };

    fetchConversations();
    socket.on("conversationUpdated", (data) => {
      console.log("Conversation updated:", data);
      fetchConversations(); // Chỉ fetch lại khi có sự thay đổi
    });

    return () => {
      socket.off("conversationUpdated");
    };
  }, [user._id]);

  { /* Lắng nghe sự kiện nhận tin nhắn từ server */ }
  useEffect(() => {
    if (selectedChat) {
      const conversationId = selectedChat.conversationId;
      console.log("Listening for messages on conversation:", conversationId);
      socket.on(`receiveMessage-${conversationId}`, (msg) => {
        console.log("Received message from socket:", msg);
        setMessages((prev) => [...prev, msg]);
        console.log("Messages:", messages);
      });

      return () => {
        socket.off(`receiveMessage-${conversationId}`);
      };
    }
  }, [selectedChat]);

  { /* Nhắn tin */ }
  const sendMessage = (fileUrl = null, fileName = null) => {
    console.log("fileUrlsendMessage", fileUrl);
    console.log("fileNamesendMessage", fileName);

    if (!inputText.trim() && !fileUrl) {
      console.log("❌ Tin nhắn rỗng, không gửi");
      return;
    }

    let fileType = "text"; // Mặc định là tin nhắn văn bản
    let messageData = {
      conversationId: selectedChat.conversationId,
      senderId: user._id,
      messageType: "text",
      text: inputText || "",
      replyTo: replyingMessage ? replyingMessage._id : null,
    };

    if (fileUrl) {
      const imageExtensions = ["jpg", "jpeg", "png", "gif"];
      const videoExtensions = ["mp4", "mov"];
      const fileExtensions = ["pdf", "docx", "xlsx", "doc", "pptx"];

      const fileExtension = fileName.split(".").pop().toLowerCase();

      if (imageExtensions.includes(fileExtension)) {
        fileType = "image";
        messageData.imageUrl = fileUrl;
      } else if (videoExtensions.includes(fileExtension)) {
        fileType = "video";
        messageData.videoUrl = fileUrl;
      } else if (fileExtensions.includes(fileExtension)) {
        fileType = "file";
        messageData.fileUrl = fileUrl;
      }

      messageData.messageType = fileType;
      messageData.fileName = fileName;
    }

    console.log("Dữ liệu tin nhắn gửi qua socket:", messageData); // Debug

    // Gửi lên socket
    socket.emit("sendMessage", messageData);
    setReplyingMessage(null); // Clear sau khi gửi
    setInputText("");
  };


  { /* Pin tin nhắn */ }
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const scrollToPinnedMessage = () => {
    const pinnedElement = messageRefs.current[pinnedMessage._id];
    if (pinnedElement) {
      pinnedElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightedMessageId(pinnedMessage._id);
    // Bỏ highlight sau 2 giây
    setTimeout(() => setHighlightedMessageId(null), 2000);
  };

  { /* Cuộn tới tin nhắn */ }
  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[messageId];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });

      // Highlight tin nhắn được cuộn tới
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000); // xóa highlight sau 2s
    }
  };

  { /* Lấy tin nhắn theo conversationId */ }
  const fetchMessagesByConversationId = async (conversationId) => {
    try {
      const response = await fetch(
        `http://localhost:8004/messages/get/${conversationId}`
      );
      const data = await response.json();
      const pinnedMessage = data.find((msg) => msg.isPinned === true);
      setPinnedMessage(pinnedMessage);
      return data; // data sẽ là mảng messages
    } catch (error) {
      console.error("Lỗi khi lấy messages:", error);
      return [];
    }
  };

  { /* Lắng nghe sự kiện khi chọn chat */ }
  const handleSelectChat = async (chat) => {
    const messages = await fetchMessagesByConversationId(chat.conversationId);
    setSelectedChat({
      ...chat,
    });
    socket.emit("markAsSeen", {
      conversationId: chat.conversationId,
      userId: user._id,
    });
    console.log("chat", chat);
    if (chat.lastMessageSenderId !== user._id) {
      socket.emit("messageSeen", {
        messageId: chat.lastMessageId,
        userId: user._id,
      });
      console.log("chat", chat);
    }
    setMessages(messages);
    setShowFriendRequests(false); // Ẩn danh sách lời mời kết bạn
  };

  const showContacts = () => {
    setSearchTerm("");   // Xóa nội dung ô tìm kiếm
    setSearchResult(null);
    setSidebarView("contacts");
    setSelectedChat("");
  };
  const showChatlists = () => {
    setSearchResult(null);
    setSearchTerm("");   // Xóa nội dung ô tìm kiếm
    setSidebarView("chat-list");
    setSelectedTitle("Chào mừng bạn đến với ứng dụng chat! ");
    setSelectedTitle2("Chào mừng bạn đến với ứng dụng chat! ");
    setSelectedHeader("");
  };


  // Hàm bật/tắt menu
  const toggleMenu = () => {
    setShowMenu((prev) => !prev);
  };

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutsideMenu = (event) => {
      // Đóng cả menu đăng xuất và menu xóa bạn khi click ra ngoài
      if ((menuRef.current && !menuRef.current.contains(event.target))) {
        setShowMenu(false); // Đóng menu đăng xuất
      }
        if ((friendRef.current && !friendRef.current.contains(event.target)) ) {
        setSelectedFriend(null); // Đóng menu "Xóa bạn"
      }
    };

    document.addEventListener("mousedown", handleClickOutsideMenu);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideMenu);
    };
  }, []); // Chạy khi component mount và unmount

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    console.log("Logging out...");
    navigate("/");
  };

  // Hàm xử lý format thời gian tin nhắn
  const formatTimeMessage = (timestamp) => {
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

  { /* Hover vào menu tin nhắn và menu chat */ }
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [menuMessageId, setMenuMessageId] = useState(null);
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuChatId, setMenuChatId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".message-menu") &&
        !e.target.closest(".three-dots-icon") &&
        !e.target.closest(".chat-popup-menu") &&
        !e.target.closest(".chat-three-dots-icon")
      ) {
        setMenuMessageId(null);
        setMenuChatId(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  { /* Xử lý pin tin nhắn */ }
  const handlePinMessage = async (messageId, isPinned) => {
    await fetch(`http://localhost:8004/messages/pin/${messageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned }),
    });
    handleSelectChat(selectedChat);
    setMenuMessageId(null);
  };

  { /* Xử lý xóa tin nhắn phía tôi */ }
  const handleDeleteMessageFrom = async (messageId) => {
    await fetch(`http://localhost:8004/messages/deletefrom/${messageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id }),
    });
    handleSelectChat(selectedChat);
    setMenuMessageId(null);
  };

  { /* Xử lý thu hồi tin nhắn */ }
  const handleRecallMessage = async (messageId) => {
    try {
      const response = await fetch(
        `http://localhost:8004/messages/recall/${messageId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({conversationId: selectedChat.conversationId}),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        toast.warning(data.message || "Không thể thu hồi tin nhắn");
        return;
      }
      await handleSelectChat(selectedChat); // Refresh messages
    } catch (error) {
      console.error("Recall error:", error);
      toast.error("Đã có lỗi xảy ra khi thu hồi tin nhắn");
    } finally {
      setMenuMessageId(null);
    }
  };


  { /* Xử lý trả lời tin nhắn */ }
  const [replyingMessage, setReplyingMessage] = useState(null);
  const handleReplyMessage = (msg) => {
    setReplyingMessage(msg);
    inputRef.current?.focus();
  };

  const handleDeleteChat = async (chatId) => {
    if (window.confirm("Bạn có chắc muốn xoá đoạn chat này?")) {
      socket.emit("deleteChat", { conversationId: chatId });
    }
  };
  useEffect(() => {
    socket.on("chatDeleted", ({ conversationId }) => {
      setChats((prevChats) =>
        prevChats.filter((chat) => chat.conversationId !== conversationId)
      );
      // Nếu đang ở đoạn chat bị xóa thì điều hướng về trang chat-list
      if (selectedChat && selectedChat._id === conversationId) {
        setSelectedChat(null);
      }
    });

    return () => {
      socket.off("chatDeleted");
    };
  }, [selectedChat]);

  // // Xử lý gửi tin nhắn hoặc ảnh/video
  // const sendMessage = () => {
  //     if (input.trim() || selectedImage || selectedVideo) {
  //         const newMessage = {
  //             text: input,
  //             sender: "me",
  //             sentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  //             receivedTime: null,
  //             status: "sending",
  //             image: selectedImage,
  //             video: selectedVideo,
  //         };

  //         setMessages([...messages, newMessage]);

  //         setTimeout(() => {
  //             setMessages((prevMessages) =>
  //                 prevMessages.map((msg, index) =>
  //                     index === prevMessages.length - 1
  //                         ? { ...msg, status: "sent", receivedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
  //                         : msg
  //                 )
  //             );
  //         }, 1000);

  //         setInput("");
  //         setSelectedImage(null);
  //         setSelectedVideo(null);
  //     }
  // };

  // Xử lý chọn nhiều ảnh
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files); // Lấy danh sách file
    const imageUrls = files.map((file) => URL.createObjectURL(file)); // Tạo URL cho mỗi ảnh

    // Đảm bảo rằng prevImages là mảng trước khi thêm ảnh mới vào
    setSelectedImage((prevImages) => {
      const validPrevImages = Array.isArray(prevImages) ? prevImages : []; // Kiểm tra prevImages là mảng
      return [...validPrevImages, ...imageUrls]; // Thêm ảnh mới vào prevImages
    });
  };




  // Xử lý chọn video
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("video")) {
      const videoUrl = URL.createObjectURL(file);
      setSelectedVideo(videoUrl);
    }
  };

  useEffect(() => {
    socket.on("newMessage", (message) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.conversationId === message.conversationId
            ? {
              ...chat,
              lastMessage: message.lastMessage,
              unreadCount: chat.unreadCount + 1 // ✅ Tăng số tin chưa đọc ngay
            }
            : chat
        )
      );

      // Nếu tin nhắn thuộc cuộc trò chuyện hiện tại, cập nhật tin nhắn mới ngay
      if (selectedChat?.conversationId === message.conversationId) {
        setMessages((prevMessages) => [...prevMessages, message]); // ✅ Thêm tin nhắn mới vào danh sách
      }
    });

    return () => {
      socket.off("newMessage");
    };
  }, [selectedChat]);


  //Xử lý upload ảnh

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    console.log("file handleFileUpload", file);
    if (!file) return;

    // Reset input file để kích hoạt sự kiện onChange khi chọn lại cùng file
    e.target.value = ""; 

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", selectedChat.conversationId);
    formData.append("senderId", user._id);

    console.log("formData", formData);
    console.log("Các key trong FormData:");
    for (let key of formData.keys()) {
      console.log(key);
    }
    

    const fileUrl = URL.createObjectURL(file) + `#${Math.random()}`;
    console.log("fileUrl", fileUrl);
    try {
      const response = await fetch("http://localhost:8004/messages/upload", {
        method: "POST",
        body: formData,
      });
      console.log("Raw response:", response);


      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      console.log("Response data:", data);
      const uploadedFileUrl = data.fileUrl || data.imageUrl || data.videoUrl; // URL Cloudinary\
      console.log("Uploaded file URL:", uploadedFileUrl);
      sendMessage(uploadedFileUrl, file.name); // Gửi tin nhắn với URL đã upload

    } catch (error) {
      console.error("Upload error:", error);
    }
  };




  const [isOpen, setIsOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);


  const handleEmojiClick = (emojiObject) => {
    const emoji = emojiObject.emoji;
    if (inputText.trim() === "") {
      // Gửi emoji riêng nếu không có text
      setInputText(emoji);
    } else {
      // Thêm emoji vào input nếu đang gõ text
      setInputText((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prevState) => !prevState);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showEmojiPicker &&
        !event.target.closest(".emoji-picker") &&
        !event.target.closest(".icon-input")
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showEmojiPicker]);

  const openModal = (url, type) => {
    setMediaUrl(url);
    setMediaType(type);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setMediaUrl("");
    setMediaType("");
  };

  //CHECK LỜI MỜI KB
  useEffect(() => {
    const checkFriendRequestStatus = async () => {
      if (!user || !searchResult || !user._id || !searchResult._id) return;

      try {
        const response = await fetch(`http://localhost:8004/friends/checkfriend/${user._id}/${searchResult._id}`);
        const data = await response.json();

        if (data.status === "pending") {
          setIsFriendRequestSent(true);
        } else {
          setIsFriendRequestSent(false);
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra lời mời kết bạn:", error);
      }
    };

    checkFriendRequestStatus();
  }, [searchResult?._id, user?._id]); // Chạy khi searchResult hoặc user thay đổi


  // Tìm kiếm user theo sđt
  const handleSearchUser = async () => {
    loadFriends();
    try {
      const response = await fetch(`http://localhost:8004/friends/search?phone=${searchTerm}`);
      const data = await response.json();
      console.log('KQ Search: ', data);
      if (response.ok) {
        setSearchResult(data);
        toast.success(data.message); // Hiển thị thông báo thành công
      } else {

        toast.error(data.message); // Hiển thị thông báo lỗi
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm:", error);
    }
  };
  //Gửi lời mời kết bạn
  const handleSendFriendRequest = async (receiverId) => {
   
    try {
      const response = await fetch("http://localhost:8004/friends/send-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user._id, receiverId }),
      });

      const data = await response.json();
      if (response.ok) {

        // Cập nhật trạng thái ngay lập tức để giao diện thay đổi
        setIsFriendRequestSent(true);

        // Gọi lại loadFriends để cập nhật danh sách bạn bè nếu API cập nhật ngay
        loadFriends();
        toast.success("Đã gửi lời mời kết bạn!"); // Hiển thị thông báo thành công
       
      } else {
        toast.error(data.message); // Hiển thị thông báo lỗi
      }
    } catch (error) {
      console.error("Lỗi khi gửi lời mời:", error);
    }
  };

  //Thu hồi lời mời kết bạn 
  const handleCancelFriendRequest = async (friendId) => {
    try {
      const response = await fetch("http://localhost:8004/friends/cancel-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: user._id, receiverId: friendId }),
      });

      if (!response.ok) {
        throw new Error("Lỗi khi thu hồi lời mời kết bạn");
      }

      setIsFriendRequestSent(false); // Cập nhật lại trạng thái
      toast.success("Đã thu hồi lời mời kết bạn!");
    } catch (error) {
      console.error("Lỗi khi thu hồi lời mời kết bạn:", error);
      toast.error("Không thể thu hồi lời mời!");
    }
  };
  // Gọi hàm loadFriendRequests khi component được render
  useEffect(() => {
    loadFriendRequests();
  }, []);


  const loadFriendRequests = async () => {
    if (!user || !user._id) return;

    try {
      const response = await fetch(`http://localhost:8004/friends/friend-requests/${user._id}`);
      const data = await response.json();
      setFriendRequests(data); // Lưu danh sách vào state
    } catch (error) {
      console.error("Lỗi khi tải danh sách lời mời kết bạn:", error);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await fetch(`http://localhost:8004/friends/getfriend/${user._id}`, { // Gửi userId để lấy danh sách bạn bè
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Lỗi khi tải danh sách bạn bè");
      }

      const data = await response.json();
      console.log("Danh sách bạn bè:", data);
      setFriends(data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách bạn bè:", error);
    }
  };

  // useEffect để load danh sách bạn bè khi component mount hoặc user._id thay đổi
  useEffect(() => {
    if (user._id) {
      loadFriends();
    }
  }, [user._id]);

  // Gọi API để hủy kết bạn
  const handleRemoveFriend = async (friendId) => {
    if (!user || !user._id) {
      console.error("Không tìm thấy thông tin người dùng.");
      return;
    }

    // Hiển thị hộp thoại xác nhận
    const isConfirmed = window.confirm("Bạn có chắc chắn muốn hủy kết bạn?");
    if (!isConfirmed) return; // Nếu người dùng chọn "Hủy", thoát khỏi hàm

    try {
      const response = await fetch("http://localhost:8004/friends/unfriend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, friendId }),
      });

      if (!response.ok) throw new Error("Lỗi khi hủy kết bạn");

      // Cập nhật danh sách bạn bè
      setFriends(friends.filter((friend) => friend._id !== friendId));
      setSelectedFriend(null);
    } catch (error) {
      console.error("Lỗi khi hủy kết bạn:", error);
    }
  };


  const handleClick = (tab) => {
    console.log("Clicked:", tab);
    setSearchResult(null); // Xóa kết quả tìm kiếm
    setSelectedChat(null);
    setSelectedHeader(tab);
    setSelectedTitle("");
    setSelectedTitle2("");

    if (tab === "Lời mời kết bạn") {
      setSelectedChat(null);
      setShowFriendRequests(false); // Ẩn đi trước để React re-render
      setTimeout(() => {
        setShowFriendRequests(true);
        if (friendRequests.length === 0) {
          console.log("Loading friend requests...");
          loadFriendRequests();
        }
      }, 0); // Có thể tăng lên 200 nếu vẫn lỗi
    } else if (tab === "Danh sách bạn bè") {
      loadFriends(); // Gọi API danh sách bạn bè
    }
    else {
      setShowFriendRequests(false);
    }
  };
  useEffect(() => {
    if (selectedChat?.name === "Lời mời kết bạn") {
      setShowFriendRequests(true);
    } else {
      setShowFriendRequests(false);
    }
  }, [selectedChat]);

  const acceptRequest = async (requestId) => {
    try {
      const response = await fetch("http://localhost:8004/friends/accept-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();
      if (response.ok) {
        setFriendRequests((prevRequests) =>
          prevRequests.filter((request) => request._id !== requestId)
        );

        toast.success(data.message);
        loadFriendRequests(); // Cập nhật lại danh sách sau khi chấp nhận
      } else {
        toast.error(data.message || "Có lỗi xảy ra!");

      }
    } catch (error) {
      console.error("Lỗi:", error);
      toast.error("Lỗi kết nối server!");

    }
  };

  const rejectRequest = async (requestId) => {
    try {
      const response = await fetch("http://localhost:8004/friends/reject-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();
      if (response.ok) {
        setFriendRequests((prevRequests) =>
          prevRequests.filter((request) => request._id !== requestId)
        );
        toast.success(data.message);
        loadFriendRequests(); // Cập nhật lại danh sách sau khi từ chối
      } else {
        toast.error(data.message || "Có lỗi xảy ra!");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      toast.error("Lỗi kết nối server!");
    }
  };
  // Toggle menu ba chấm
  const toggleMenuXoa = (friendId) => {
    setSelectedFriend(selectedFriend === friendId ? null : friendId);
  };

  // Xử lý tìm kiếm chat
  useEffect(() => {
    if (chatSearch && chatSearch.conversationId) {
      handleSelectChat(chatSearch);
    }
  }, [chatSearch]);
  //Tạo cuộc hội thoại từ kết quả tìm kiếm
  const createNewChat = async (receiverId) => {
    setSelectedHeader("");

    try {
      // 1️⃣ Gọi API để lấy danh sách cuộc trò chuyện
      const response = await fetch(`http://localhost:8004/conversations/${user._id}/search`);
      const conversations = await response.json();

      // 2️⃣ Kiểm tra xem cuộc trò chuyện với receiverId đã tồn tại chưa
      const existingConversation = conversations.find(conv =>
        conv.members.length === 2 && // Chỉ kiểm tra chat 1-1
        conv.members.some(member => member._id === user._id) &&
        conv.members.some(member => member._id === receiverId)
      );
      console.log("receiverId nhận được từ friend", receiverId);
      const userreciver = await fetch(`http://localhost:8004/users/get/${receiverId}`);
      const data = await userreciver.json();
      console.log("data", data);


      console.log("Cuộc trò chuyện đã tồn tại:", existingConversation);

      console.log("Selected chat đã set:", selectedChat);
      if (existingConversation) {
        setChatSearch(prevState => ({
          ...prevState,
          conversationId: existingConversation._id,
          name: data.username,
          image: data.avatar,
          active: data.isOnline
        }));

        console.log("chatSearch", chatSearch);
   

        return;
      }


      // 3️⃣ Nếu chưa có, tạo mới cuộc trò chuyện
      const createResponse = await fetch("http://localhost:8004/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: [user._id, receiverId],
          isGroup: false
        })
      });

      const newConversation = await createResponse.json();
      if (createResponse.ok) {
        console.log("Tạo cuộc trò chuyện mới thành công:", newConversation);
       
        console.log("newConversation", newConversation);
        setChatSearch(prevState => ({
          ...prevState,
          conversationId: newConversation._id,
          name: data.username,
          image: data.avatar,
          active: data.isOnline,
          lastMessage: "",
          lastMessageTime: Date.now()
        }));

        console.log("chatSearch", chatSearch);
      
      } else {
        console.error("Lỗi khi tạo cuộc trò chuyện:", newConversation.message);
      }
    } catch (error) {
      console.error("Lỗi kết nối server:", error);
    }
  };

  //Hàm xử lý cập nhật thông tin user
  useEffect(() => {
    if (user) {
      setUpdatedUser({
        username: user.username,
        phone: user.phone,
        password: '',
        avatar: user.avatar,
      });
    }
  }, [user]); // Chạy lại mỗi khi user thay đổi (nếu có)

  const handleChange = (e) => {
    setPassword(e.target.value);
    setUpdatedUser({
      ...updatedUser,
      [e.target.name]: e.target.value
    });
   
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    setAvatarPreview(URL.createObjectURL(file));
    setUpdatedUser({
      ...updatedUser,
      avatar: file
    });
  };

  const handleUpdate = async () => {
    console.log("Response trước khi:", updatedUser);
    try {
      const formData = new FormData();
      formData.append('username', updatedUser.username);
      formData.append('phone', updatedUser.phone);
      formData.append('password', updatedUser.password);
      if (updatedUser.avatar) {
        formData.append('avatar', updatedUser.avatar);
      }

      const response = await axios.put(`http://localhost:8004/users/update/${user._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      

      // Sau khi cập nhật thành công, cập nhật lại user với thông tin mới
      setUpdatedUser({
        username: response.data.username,
        phone: response.data.phone,
        password: '',
        avatar: response.data.avatar,
      });
      console.log("Response updated:", updatedUser);
      toast.success("Cập nhật thông tin thành công!");
      setShowModal(false);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  

  return (
    <div className="chat-app">
      <ToastContainer position="top-right" autoClose={3000} />
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-item">
          <h2 className="sidebar-title">Chats</h2>
          <FaEllipsisV className="bacham-icon" />
        </div>

        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (searchTerm.trim() !== "") {
                  handleSearchUser();
                }
              }
            }}

          />

          {/* Sử dụng FaTimes thay vì FaSearch */}
          {searchTerm && (
            <FaTimes
              className="search-icon"
              onClick={(e) => {
                setSearchTerm("");   // Xóa nội dung ô tìm kiếm
                setSearchResult(null); // Xóa kết quả tìm kiếm
              }}
            />
          )}


        </div>

        {searchResult && (
          <>
            <div className="title-search">
              {searchResult.username && <p>Tìm bạn qua số điện thoại</p>}
            </div>

            <div className="search-user-info" >
              <div className="img-user-search">
                <img src={searchResult.avatar} alt={searchResult.username} className="avatar" onClick={() => createNewChat(searchResult._id)} />
              </div>
              <div className="info-user-search">
                <p className="search-username">{searchResult.username}</p>
                <p className="search-phone">Số điện thoại: <span>{searchResult.phone}</span></p>

                {searchResult._id !== user._id && (
                  friends.some(friend => friend._id === searchResult._id) ? (
                    <span className="friend-label">Bạn bè</span>
                  ) : isFriendRequestSent ? (
                      <>
                        <span className="added-request">Đã gửi lời mời kết bạn</span>
                        <button onClick={() => handleCancelFriendRequest(searchResult._id)} className="cancel-button">
                          Thu hồi
                        </button>
                      </>
                  ) : (
                    <button onClick={() => handleSendFriendRequest(searchResult._id)}>
                      Kết bạn
                    </button>
                  )
                )}
              </div>
            </div>
          </>
        )}

        {sidebarView === "chat-list" && (
          <div className="chat-list">
            {chats
              .filter((chat) =>
                chat.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
              )
              .map((chat, index) => (
                <div
                  key={index}
                  className="chat-left"
                  onClick={() => handleSelectChat(chat)}
                  onMouseEnter={() => setHoveredChatId(chat._id)}
                >
                  <div className="avatar-container">
                    <img src={chat.image} alt={chat.name} className="avatar" />
                    {chat.active && <span className="active-dot"></span>}
                  </div>

                  <div className="chat-container">
                    <p className="chat-name">{chat.name}</p>
                    <p
                      className={`chat-message ${chat.unreadCount > 0 ? "unread-message" : ""
                        }`}
                    >
                      {chat.lastMessageSenderId?.toString() ===
                        user._id.toString()
                        ? `Bạn: ${chat.lastMessage.length > 10
                          ? chat.lastMessage.slice(0, 10) + "..."
                          : chat.lastMessage
                        }`
                        : chat.lastMessage.length > 10
                          ? chat.lastMessage.slice(0, 10) + "..."
                          : chat.lastMessage}

                      {chat.unreadCount > 0 && (
                        <span className="unread-badge">
                          • {chat.unreadCount}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="chat-timestamp">
                    <p
                      className={`chat-timestamp-item ${chat.unreadCount > 0 ? "unread-timestamp" : ""
                        }`}
                    >
                      {formatTimeMessage(chat.lastMessageTime)}
                    </p>
                  </div>
                  {(
                    <div
                      className="chat-more-options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuChatId(chat.conversationId); // Mở menu popup cho đoạn chat này
                        setMenuPosition({ x: e.clientX, y: e.clientY });
                      }}
                    >
                      <span>⋮</span>
                    </div>
                  )}

                  {menuChatId === chat.conversationId && (
                    <div
                      className="chat-popup-menu"
                      style={{ top: menuPosition.y, left: menuPosition.x }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        style={{
                          color: "red",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleDeleteChat(chat.conversationId)}
                      >
                        <FiTrash2 size={18} color="red" />
                        Xóa đoạn chat
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
        {sidebarView === "contacts" && (
          <div className="contacts-list">
            <div
              className="contacts-header"
              onClick={() => handleClick("Danh sách bạn bè")}
            >
              <FaUser className="icon-contacts" />
              <span>Danh sách bạn bè</span>
            </div>

            <div
              className="contacts-header"
              onClick={() => handleClick("Danh sách nhóm và cộng đồng")}
            >
              <FaUsers className="icon-contacts" />
              <span>Danh sách nhóm và cộng đồng</span>
            </div>
            <div
              className="contacts-header"
              onClick={() => handleClick("Lời mời kết bạn")}
            >
              <FaUserPlus className="icon-contacts" />
              <span>Lời mời kết bạn</span>
            </div>

            <div
              className="contacts-header"
              onClick={() => handleClick("Lời mời vào nhóm và bạn bè")}
            >
              <FaUserCheck className="icon-contacts" />
              <span>Lời mời vào nhóm và bạn bè</span>
            </div>
          </div>
        )}
      </div>
      <div className="icon-container-left">
        {/* Avatar nhấn vào để mở modal */}
        {user && (
          <div className="icon-item" onClick={() => setShowModal(true)}>
            <img src={user.avatar} alt="Avatar" className="chat-avatar" />
          </div>
        )}
        {/* Modal hiển thị thông tin user */}
        {showModal && user && (
          <div className="modal-overlayuser"
            onClick={(e) => {
              if (e.target === e.currentTarget) { // Kiểm tra xem có click vào overlay (ngoài modal)
                setShowModal(false); // Đóng modal
              }
            }}>
            <div className="modal-contentuser">
              <span className="close-btnuser" onClick={() => setShowModal(false)}>&times;</span>
              <h5>Thông tin tài khoản</h5>
              <img
                src="https://res-console.cloudinary.com/dapvuniyx/thumbnails/v1/image/upload/v1742811884/Y3ptcjF1bmJwcXh3MXRoMWw4aTI=/drilldown"
                alt=""
                className="profile-avataruser-nen"
              />
              <div className="profile-use">
                <img
                  src={avatarPreview || user.avatar}
                  alt="Avatar"
                  className="profile-avataruser"
                />
                {/* Thay input bằng icon */}
                <label htmlFor="avatar-upload" className="avatar-icon-label">
                  <FaCamera size={25} color="black"/> {/* Thêm icon từ react-icons */}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="avatar-upload"
                  style={{ display: "none" }}  // Ẩn input mặc định đi
                />
                <p>
                  <input
                    type="text"
                    name="username"
                    value={updatedUser.username}
                    onChange={handleChange}
                    placeholder="Nhập tên mới"
                    className="username-input"
                  />
                </p>
              </div>

              <div className="thongtin-canhan">
                <h5>Thông tin cá nhân</h5>
                <p>
                  <strong>Email:</strong> 
                  <input
                    type="text"
                    name="email"
                    value={user.email}
                    // onChange={handleChange}
                    readOnly // Chỉ xem, không chỉnh sửa được
                    placeholder="Nhập email mới"
                   
                  />
                </p>
                <p>
                  <strong>Số điện thoại:</strong>
                  <input
                    type="text"
                    name="phone"
                    value={updatedUser.phone}
                    onChange={handleChange}
                    placeholder="Nhập số điện thoại mới"
                  />
                </p>
                <p>
                  <strong>Mật khẩu:</strong>
                  <input
                    type={showPassword ? "text" : "password"} // Đổi loại input giữa text và password
                    name="password"
                    value={updatedUser.password}
                    onChange={handleChange}
                    placeholder="Nhập mật khẩu mới"
                    style={{ paddingRight: "30px" }} // Dành không gian cho icon
                  />
                  <span
                    onClick={togglePasswordVisibility}
                    style={{
                      position: "absolute",
                      right: "30px",
                      top: "82.5%",
                      transform: "translateY(-50%)",
                      cursor: "pointer",
                    }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </p>
              </div>

              <button onClick={handleUpdate} className="update-btn">
                Cập nhật
              </button>
            </div>
          </div>
        )}
        
        <div className="icon-item" onClick={showChatlists}>
          <FaComments className="icon chat-icon" title="Chat" />
          <span className="chat-icon-text">Chats</span>
        </div>
        <div className="icon-item" onClick={showContacts}>
          <FaAddressBook className="icon group-icon" title="Contacts" />
          <span className="chat-icon-text">Contacts</span>
        </div>

        <div className="icon-item" onClick={toggleMenu} ref={menuRef}>
          <FaCog className="icon user-icon" title="Settings" />
          <span className="chat-icon-text">Setting</span>

          {showMenu && (
            <div className="settings-menu">
              <button onClick={() => handleLogout()} className="logout-btn">
                Đăng xuất
              </button>

            </div>
          )}
        </div>
      </div>

      {selectedHeader === "Lời mời kết bạn" ? (
        <div className="friend-requests">
          <h2>Lời mời kết bạn</h2>
          {friendRequests.length > 0 ? (
            friendRequests.map((request) => (
              console.log("request nhận được", request),
              <div key={request.id} className="friend-request-item">

                <div className="friend-info">
                  <img src={request.senderId.avatar} alt="avatar" className="friend-avatar" />
                  <p className="friend-name">{request.senderId.username}</p>
                </div>
                <div className="friend-actions">
                  <button onClick={() => acceptRequest(request._id)}>Chấp nhận</button>
                  <button onClick={() => rejectRequest(request._id)}>Từ chối</button>
                </div>

              </div>
            ))
          ) : (
            <p className="not-requestfriend">Không có lời mời kết bạn nào.</p>
          )}
        </div>
      ) : selectedHeader === "Danh sách bạn bè" ? ( // Thêm điều kiện này
          <div className="friends-list">
          <h2>Danh sách bạn bè</h2>
          {friends.length > 0 ? (
              friends.map((friend) => (
                console.log("friend nhận được", friend._id),
                
                <div key={friend._id} className="friend-item" ref={friendRef}>
                  <div className="friend-info">
                  <img src={friend.avatar} alt="avatar" className="friend-avatar" onClick={() => {
                    if (friend._id) {
                      createNewChat(friend._id);
                    } else {
                      console.error("friend._id bị undefined:", friend);
                    }
                  }}/>
                  <p className="friend-name">{friend.username}</p>
                      <FaEllipsisV className="bacham-banbe" onClick={() => toggleMenuXoa(friend._id)}  />
                </div>
                {selectedFriend === friend._id && (
                      <div className="dropdown-menu" ref={friendMenuRef} >
                    <button onClick={() => handleRemoveFriend(friend._id)}>Xóa bạn</button>
                  </div>
                )}

                <br /><hr />
              </div>

            ))
          ) : (
            <p className="not-friend">Bạn chưa có bạn bè nào.</p>
          )}
        </div>

      ) : selectedChat ? (

        <div className="chat-window">
          {/* Header */}

          <div className="chat-header">
            <div className="avatar-container-main">
              <img src={selectedChat.image} alt="img" className="avatar" />
              <div className="avatar-container-main-item">
                <p className="chat-title-main">{selectedChat.name}</p>
                <p className="active-statu-main">
                  {selectedChat.active ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <div className="chat-icons">
              <FaVideo className="icon" />
              <FaPhone className="icon" />
              <FaStarHalfAlt className="icon" />
              <FaExclamationCircle className="icon" />
            </div>
          </div>
          {pinnedMessage && (
            <div className="pinned-message" onClick={scrollToPinnedMessage}>
              <div className="pinned-label">📌 Đã ghim</div>
              <div className="pinned-content">{pinnedMessage.text}</div>
              <div className="pinned-timestamp">
                {new Date(pinnedMessage.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <FaTimes
                className="unpin-icon"
                onClick={(e) => {
                  handlePinMessage(pinnedMessage._id, false);
                  e.stopPropagation();
                }}
              />
            </div>
          )}

          {/* Messages */}
          <div className="chat-box">
            {messages
              .filter((msg) => !msg.deletedFrom?.includes(user._id))
              .map((msg, index) => {
                const currentDate = new Date(
                  msg.createdAt
                ).toLocaleDateString();
                const prevDate =
                  index > 0
                    ? new Date(
                      messages[index - 1].createdAt
                    ).toLocaleDateString()
                    : null;
                const showDateDivider = currentDate !== prevDate;

                const isMe =
                  (msg.sender?._id || msg.senderId?._id || msg.senderId) ===
                  user._id;
                return (
                  <>
                    {showDateDivider && (
                      <div className="date-divider">
                        <span>
                          {new Date(msg.createdAt).toLocaleDateString("vi-VN", {
                            weekday: "long",
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                    <div
                      key={index}
                      ref={(el) => (messageRefs.current[msg._id] = el)}
                      className={`message-row ${isMe ? "me" : "them"} ${highlightedMessageId === msg._id ? "highlight" : ""
                        }`}
                    >
                      <div
                        className={`message-row ${isMe ? "me" : "them"}`}
                        onMouseEnter={() => setHoveredMessageId(msg._id)}
                      >
                        {/* Avatar bên trái nếu là 'them' */}
                        {!isMe && (
                          <img
                            src={selectedChat.image || "/default-avatar.png"}
                            alt="avatar"
                            className="message-avatar"
                          />
                        )}

                        <div
                          className={`message-content ${isMe ? "me" : "them"}`}
                        >
                          {msg.isRecalled ? (
                            <p className="recalled-message">
                              Tin nhắn đã bị thu hồi
                            </p>
                          ) : (
                            <>
                              {msg.replyTo && (
                                <div
                                  className="reply-to clickable"
                                  onClick={() =>
                                    scrollToMessage(msg.replyTo._id)
                                  }
                                >
                                  <span className="reply-preview-text">
                                    {msg.replyTo.text ||
                                      msg.replyTo.fileName ||
                                        (msg.replyTo.imageUrl && "Ảnh") ||
                                      (msg.replyTo.video && "Video")}
                                  </span>
                                </div>
                              )}

                              {msg.text && <p>{msg.text}</p>}
                                {msg.imageUrl && (
                                <img
                                    src={msg.imageUrl}
                                  alt="sent"
                                  className="chat-image"
                                    onClick={() => openModal(msg.imageUrl, "image")}
                                  />
                                  
                              )}
                                {msg.videoUrl && (
                                <video
                                  controls
                                  className="chat-video"
                                    onClick={() => openModal(msg.videoUrl, "video")}
                                >
                                    <source src={msg.videoUrl} type="video/mp4" />
                                </video>
                              )}
                              {msg.fileUrl && (
                                <div className="file-message">
                                  <a
                                      href={msg.fileUrl}
                                    download={msg.fileName}
                                    className="file-link"
                                  >
                                    {msg.fileName}
                                  </a>
                                </div>
                              )}
                            </>
                          )}

                          <div className="message-info">
                            <span className="timestamp">
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                                : ""}
                            </span>
                            {msg.status === "sending" ? (
                              <FaClock className="status-icon" />
                            ) : (
                              <FaCheck className="status-icon" />
                            )}
                          </div>
                        </div>
                        {/* Nút ba chấm khi hover */}
                        {hoveredMessageId === msg._id && (
                          <div
                            className={`three-dots-icon ${isMe ? "left" : "right"
                              }`}
                          >
                            <FaEllipsisH
                              className="icon"
                              onClick={(e) => {
                                setMenuMessageId(msg._id);
                                e.stopPropagation(); // chặn click propagation
                              }}
                            />
                            {menuMessageId === msg._id && (
                              <div
                                className={`message-menu ${isMe ? "left" : "right"
                                  }`}
                              >
                                {!msg.isRecalled && (
                                  <div
                                    className="menu-item"
                                    onClick={() =>
                                      handlePinMessage(msg._id, true)
                                    }
                                  >
                                    📌 Ghim tin nhắn
                                  </div>
                                )}

                                <div
                                  className="menu-item"
                                  onClick={() =>
                                    handleDeleteMessageFrom(msg._id)
                                  }
                                  style={{ color: "red" }}
                                >
                                  ❌ Xóa phía tôi
                                </div>
                                {isMe && !msg.isRecalled && (
                                  <div
                                    className="menu-item"
                                    onClick={() => handleRecallMessage(msg._id)}
                                    style={{ color: "red" }}
                                  >
                                    🔄 Thu hồi
                                  </div>
                                )}
                                {!msg.isRecalled && (
                                  <div
                                    className="menu-item"
                                    onClick={() => handleReplyMessage(msg)}
                                  >
                                    💬 Trả lời
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Avatar bên phải nếu là 'me' */}
                        {isMe && (
                          <img
                            src={user.avatar || "/default-avatar.png"}
                            alt="avatar"
                            className="message-avatar"
                          />
                        )}
                      </div>
                    </div>
                  </>
                );
              })}
            <div ref={messagesEndRef} />
          </div>
          {replyingMessage && (
            <div className="reply-preview">
              <div className="reply-info">
                <strong>Đang trả lời:</strong>
                <span className="reply-text">
                  {replyingMessage.text ||
                    replyingMessage.fileName ||
                    (replyingMessage.image && "Ảnh") ||
                    (replyingMessage.video && "Video")}
                </span>
              </div>
              <FaTimes
                className="close-reply-icon"
                onClick={() => setReplyingMessage(null)}
              />
            </div>
          )}
          {/* Input Box */}
          <div className="input-box-chat">
            <div className="input-icon-container">
              <button className="icon-input" onClick={toggleEmojiPicker}>
                <FaSmile />
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e, "image")}
                style={{ display: "none" }}
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className="icon-input">
                <FaImage />
              </label>

              <input
                type="file"
                accept="video/*"
                onChange={(e) => handleFileUpload(e, "video")}
                style={{ display: "none" }}
                id="videoUpload"
              />
              <label htmlFor="videoUpload" className="icon-input">
                <FaVideo />
              </label>

              <input
                type="file"
                onChange={(e) => handleFileUpload(e, "file")}
                style={{ display: "none" }}
                id="fileUpload"
              />
              <label htmlFor="fileUpload" className="icon-input">
                <FaPaperclip />
              </label>

              <button className="icon-input">
                <FaMicrophone />
              </button>
            </div>
            {/* Preview selected image */}
            {Array.isArray(selectedImage) && selectedImage.length > 0 && (
              <div className="preview-container">
                {selectedImage.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`preview-${idx}`}
                    width="60"
                    height="60"
                    style={{ objectFit: "cover", borderRadius: "8px" }}
                  />
                ))}
              </div>
            )}
            {/* Preview selected video */}
            {selectedVideo && (
              <div className="preview-container">
                <video
                  width="80"
                  height="60"
                  controls
                  style={{ borderRadius: "8px" }}
                >
                  <source src={selectedVideo} type="video/mp4" />
                </video>
              </div>
            )}
            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="message-input"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (inputText.trim() !== "") {
                    sendMessage();
                  }
                }
              }}
            />
            <button onClick={sendMessage} className="send-button">
              <FaPaperPlane />
            </button>
          </div>
        </div>

      ) : (
        <>
          <div className="header-chat-window-item">
            <p>{selectedHeader}</p>
          </div>
          <div className="welcome-message">
            <h2>{selectedtitle}</h2>
            <p>{selectedtitle2}</p>
          </div>
        </>
      )}
      {/* Modal for image/video preview */}
      {isOpen && (
        <Modal
          isOpen={isOpen}
          onRequestClose={closeModal}
          shouldCloseOnOverlayClick={true} // Cho phép đóng khi click vào overlay
          contentLabel="Media Modal"
          className="modal-overlay"
          overlayClassName="overlay"
        >
          {mediaType === "image" ? (
            <img src={mediaUrl} alt="Media" className="modal-media" />
          ) : (
            <video controls className="modal-media">
              <source src={mediaUrl} type="video/mp4" />
            </video>
          )}
          <label onClick={closeModal} className="close-modal-button">
            <FaTimes />
          </label>
        </Modal>
      )}
    </div>
  );
}
