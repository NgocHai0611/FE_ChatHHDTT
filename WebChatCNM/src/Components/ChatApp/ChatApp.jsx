import { React, useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
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
} from "react-icons/fa";

import "./chatApp.css";

import Modal from "react-modal";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useLocation } from "react-router-dom";
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
  const location = useLocation();
  const user = location.state?.user; // Lấy user truyền từ navigate
  const [inputText, setInputText] = useState("");
  console.log(user);

  const [chats, setChats] = useState([]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Bước 1: Lấy danh sách conversation
        const res = await axios.get(
          `http://localhost:8004/conversations/${user._id}`
        );
        const conversations = res.data;
        console.log(conversations);
        const chatPromises = conversations.map(async (conv) => {
          // Bước 2: Lấy userId từ members (trừ currentUser)
          const otherUserId = conv.members.find((_id) => _id !== user._id);

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
    const interval = setInterval(fetchConversations, 1000);

    return () => clearInterval(interval);
  }, [user._id]);

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

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const messageData = {
      conversationId: selectedChat.conversationId,
      senderId: user._id,
      messageType: "text",
      text: inputText,
    };

    // Gửi lên socket
    socket.emit("sendMessage", messageData);

    setInputText("");
  };

  const fetchMessagesByConversationId = async (conversationId) => {
    try {
      const response = await fetch(
        `http://localhost:8004/messages/get/${conversationId}`
      );
      const data = await response.json();
      return data; // data sẽ là mảng messages
    } catch (error) {
      console.error("Lỗi khi lấy messages:", error);
      return [];
    }
  };
  const handleSelectChat = async (chat) => {
    const messages = await fetchMessagesByConversationId(chat.conversationId);
    console.log("mess", messages);
    setSelectedChat({
      ...chat,
    });

    if (chat.lastMessageSenderId !== user._id) {
      socket.emit("messageSeen", {
        messageId: chat.lastMessageId,
        userId: user._id,
      });
      console.log("chat", chat);
    }
    setMessages(messages);
  };

  const showContacts = () => {
    setSidebarView("contacts");
    setSelectedChat("");
  };
  const showChatlists = () => {
    setSidebarView("chat-list");
    setSelectedTitle("Chào mừng bạn đến với ứng dụng chat! ");
    setSelectedTitle2("Chào mừng bạn đến với ứng dụng chat! ");
    setSelectedHeader("");
  };

  const handleClick = (header) => {
    setSelectedHeader(header);
    setSelectedTitle("");
    setSelectedTitle2("");
  };

  // Hàm bật/tắt menu
  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  // Hàm xử lý đăng xuất
  const handleLogout = () => {
    console.log("Logging out...");
    navigate("/");
  };

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

  // Xử lý chọn file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file); // Tạo URL tạm cho file
      const newMessage = {
        text: "File attached",
        sender: "me",
        sentTime: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        receivedTime: null,
        status: "sending",
        file: fileUrl,
        fileName: file.name,
      };

      setMessages([...messages, newMessage]);

      setTimeout(() => {
        setMessages((prevMessages) =>
          prevMessages.map((msg, index) =>
            index === prevMessages.length - 1
              ? {
                  ...msg,
                  status: "sent",
                  receivedTime: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                }
              : msg
          )
        );
      }, 1000);
    }
  };

  const [isOpen, setIsOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleEmojiClick = (emojiData) => {
    setInput((prevInput) => prevInput + emojiData.emoji);
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

  return (
    <div className="chat-app">
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
          />
        </div>

        {sidebarView === "chat-list" && (
          <div className="chat-list">
            {chats
              .filter((chat) =>
                chat.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .slice()
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((chat, index) => (
                <div
                  key={index}
                  className="chat-left"
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="avatar-container">
                    <img src={chat.image} alt={chat.name} className="avatar" />
                    {chat.active && <span className="active-dot"></span>}
                  </div>

                  <div className="chat-container">
                    <p className="chat-name">{chat.name}</p>
                    <p
                      className={`chat-message ${
                        chat.lastMessageSenderId?.toString() !==
                        user._id.toString()
                          ? "unread-message"
                          : ""
                      }`}
                    >
                      {chat.lastMessageSenderId?.toString() ===
                      user._id.toString()
                        ? `Bạn: ${
                            chat.lastMessage.length > 10
                              ? chat.lastMessage.slice(0, 10) + "..."
                              : chat.lastMessage
                          }`
                        : chat.lastMessage.length > 10
                        ? chat.lastMessage.slice(0, 10) + "..."
                        : chat.lastMessage}
                      {chat.lastMessageSenderId?.toString() !==
                        user._id.toString() && (
                        <span className="unread-dot">•</span>
                      )}
                    </p>
                  </div>
                  <div className="chat-timestamp">
                    <p className="chat-timestamp-item">
                      {new Date(chat.timestamp).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {chat.unreadMessages > 0 && (
                      <span className="unread-badge">
                        {chat.unreadMessages}
                      </span>
                    )}
                  </div>
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
        <div className="icon-item">
          <img src={user.avatar} alt="" />
        </div>
        <div className="icon-item" onClick={showChatlists}>
          <FaComments className="icon chat-icon" title="Chat" />
          <span className="chat-icon-text">Chats</span>
        </div>
        <div className="icon-item" onClick={showContacts}>
          <FaAddressBook className="icon group-icon" title="Contacts" />
          <span className="chat-icon-text">Contacts</span>
        </div>

        <div className="icon-item" onClick={toggleMenu}>
          <FaCog className="icon user-icon" title="Settings" />
          <span className="chat-icon-text">Setting</span>

          {showMenu && (
            <div className="settings-menu">
              <button onClick={handleLogout} className="logout-btn">
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedChat ? (
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

          {/* Messages */}
          <div className="chat-box">
            {messages.map((msg, index) => {
              const currentDate = new Date(msg.createdAt).toDateString();
              const prevDate =
                index > 0
                  ? new Date(messages[index - 1].createdAt).toDateString()
                  : null;
              const showDateDivider = currentDate !== prevDate;

              const isMe =
                (msg.sender?._id || msg.senderId?._id || msg.senderId) ===
                user._id;

              return (
                <div key={index}>
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

                  <div className={`message-row ${isMe ? "me" : "them"}`}>
                    {/* Avatar bên trái nếu là 'them' */}
                    {!isMe && (
                      <img
                        src={selectedChat.image || "/default-avatar.png"}
                        alt="avatar"
                        className="message-avatar"
                      />
                    )}

                    <div className={`message-content ${isMe ? "me" : "them"}`}>
                      {msg.text && <p>{msg.text}</p>}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="sent"
                          className="chat-image"
                          onClick={() => openModal(msg.image, "image")}
                        />
                      )}
                      {msg.video && (
                        <video
                          controls
                          className="chat-video"
                          onClick={() => openModal(msg.video, "video")}
                        >
                          <source src={msg.video} type="video/mp4" />
                        </video>
                      )}
                      {msg.file && (
                        <div className="file-message">
                          <a
                            href={msg.file}
                            download={msg.fileName}
                            className="file-link"
                          >
                            {msg.fileName}
                          </a>
                        </div>
                      )}
                      <div className="message-info">
                        <span className="timestamp">
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                        {msg.status === "sending" ? (
                          <FaClock className="status-icon" />
                        ) : (
                          <FaCheck className="status-icon" />
                        )}
                      </div>
                    </div>

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
              );
            })}
            <div ref={messagesEndRef} />
          </div>

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
                onChange={handleImageUpload}
                style={{ display: "none" }}
                id="imageUpload"
              />
              <label htmlFor="imageUpload" className="icon-input">
                <FaImage />
              </label>

              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                style={{ display: "none" }}
                id="videoUpload"
              />
              <label htmlFor="videoUpload" className="icon-input">
                <FaVideo />
              </label>

              <input
                type="file"
                onChange={handleFileUpload}
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
