import { useState, useEffect } from "react";
import EmojiPicker from 'emoji-picker-react';
import {
    FaPaperPlane,
    FaSearch,
    FaPhone,
    FaVideo,
    FaStarHalfAlt,
    FaExclamationCircle,
    FaEllipsisV,
    FaComments,      // Icon Chat
    FaUserFriends,   // Icon User
    FaPhoneAlt,      // Icon Call
    FaUsers,
    FaPaperclip, FaMicrophone, FaImage, FaSmile, FaClock, FaCheck, FaTimes // Icon Groups
} from "react-icons/fa";

import "./chatApp.css"; // Import file CSS'



import Modal from "react-modal";
Modal.setAppElement("#root");

const chats = [
    {
        name: "George Alan",
        lastMessage: "I'll take it. Can you ship it?",
        active: true,
        image: "https://randomuser.me/api/portraits/men/1.jpg",
        timestamp: "10:30 AM",
        unreadMessages: 2
    },
    {
        name: "Uber Cars",
        lastMessage: "Your ride is 2 minutes away.",
        active: false,
        image: "https://randomuser.me/api/portraits/men/2.jpg",
        timestamp: "09:45 AM",
        unreadMessages: 0
    },
    {
        name: "Safiya Fareena",
        lastMessage: "Video",
        active: false,
        image: "https://randomuser.me/api/portraits/women/1.jpg",
        timestamp: "08:20 AM",
        unreadMessages: 5
    },
    {
        name: "Robert Allen",
        lastMessage: "Thanks for the update.",
        active: false,
        image: "https://randomuser.me/api/portraits/men/3.jpg",
        timestamp: "Yesterday",
        unreadMessages: 1
    },
    {
        name: "George Alan",
        lastMessage: "I'll take it. Can you ship it?",
        active: true,
        image: "https://randomuser.me/api/portraits/men/1.jpg",
        timestamp: "10:30 AM",
        unreadMessages: 2
    },
    {
        name: "Uber Cars",
        lastMessage: "Your ride is 2 minutes away.",
        active: false,
        image: "https://randomuser.me/api/portraits/men/2.jpg",
        timestamp: "09:45 AM",
        unreadMessages: 0
    },
    {
        name: "Safiya Fareena",
        lastMessage: "Video",
        active: false,
        image: "https://randomuser.me/api/portraits/women/1.jpg",
        timestamp: "08:20 AM",
        unreadMessages: 5
    },
    {
        name: "Robert Allen",
        lastMessage: "Thanks for the update.",
        active: false,
        image: "https://randomuser.me/api/portraits/men/3.jpg",
        timestamp: "Yesterday",
        unreadMessages: 1
    }
];



export default function ChatApp() {
    const [messages, setMessages] = useState([
        { text: "Hi, is the watch still up for sale?", sender: "me", sentTime: "10:00 AM", receivedTime: null, status: "sent" },
        { text: "Yes, it's available.", sender: "them", sentTime: "10:01 AM", receivedTime: "10:01 AM", status: "sent" },
        { text: "Awesome! Can I see a couple of pictures?", sender: "me", sentTime: "10:02 AM", receivedTime: null, status: "sent" },
        { text: "Sure! Sending them over now.", sender: "them", sentTime: "10:03 AM", receivedTime: "10:03 AM", status: "sent" },
    ]);

    const [input, setInput] = useState("");
    const [selectedImage, setSelectedImage] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
  

    // Xử lý gửi tin nhắn hoặc ảnh/video
    const sendMessage = () => {
        if (input.trim() || selectedImage || selectedVideo) {
            const newMessage = {
                text: input,
                sender: "me",
                sentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                receivedTime: null,
                status: "sending",
                image: selectedImage,
                video: selectedVideo,
            };

            setMessages([...messages, newMessage]);

            setTimeout(() => {
                setMessages((prevMessages) =>
                    prevMessages.map((msg, index) =>
                        index === prevMessages.length - 1
                            ? { ...msg, status: "sent", receivedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
                            : msg
                    )
                );
            }, 1000);

            setInput("");
            setSelectedImage(null);
            setSelectedVideo(null);
        }
    };

    // Xử lý chọn nhiều ảnh
    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files); // Lấy danh sách file
        const imageUrls = files.map(file => URL.createObjectURL(file)); // Tạo URL cho mỗi ảnh

        // Đảm bảo rằng prevImages là mảng trước khi thêm ảnh mới vào
        setSelectedImage(prevImages => {
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
                sentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
                            ? { ...msg, status: "sent", receivedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
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


    const handleEmojiClick = (emojiData) => {
        setInput(prevInput => prevInput + emojiData.emoji);
    };


    const toggleEmojiPicker = () => {
        setShowEmojiPicker(prevState => !prevState);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showEmojiPicker && !event.target.closest(".emoji-picker") && !event.target.closest(".icon-input")) {
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
                    <input type="text" placeholder="Search" className="search-input" />
                </div>
                <div className="chat-list">
                    {chats.map((chat, index) => (
                        <div key={index} className="chat-left">
                            <div className="avatar-container">
                                <img src={chat.image} alt={chat.name} className="avatar" />
                                {chat.active && <span className="active-dot"></span>}
                            </div>


                            <div className="chat-container">

                                <p className="chat-name">{chat.name}</p>
                                <p className="chat-message">{chat.lastMessage}</p>

                            </div>
                            <div className="chat-timestamp">

                                <p className="chat-timestamp-item">{chat.timestamp}</p>

                                {chat.unreadMessages > 0 && (
                                    <span className="unread-badge">{chat.unreadMessages}</span>
                                )}
                            </div>





                        </div>
                    ))}
                </div>
                <hr></hr>
                <div className="icon-container-left">
                    <div className="icon-item">
                        <FaComments className="icon chat-icon" title="Chat" />
                        <span className="chat-icon-text">Chats</span>

                    </div>

                    <div className="icon-item">
                        <FaPhoneAlt className="icon call-icon" title="Calls" />
                        <span className="chat-icon-text">Calls</span>

                    </div>

                    <div className="icon-item">

                        <FaUserFriends className="icon user-icon" title="Users" />
                        <span className="chat-icon-text">Users</span>

                    </div>

                    <div className="icon-item">


                        <FaUsers className="icon group-icon" title="Groups" />
                        <span className="chat-icon-text">Groups</span>

                    </div>


                </div>

            </div>

            {/* Chat Window */}
            <div className="chat-window">
                {/* Header */}
                <div className="chat-header">


                    <div className="avatar-container-main">

                        <img src="https://randomuser.me/api/portraits/men/1.jpg" alt="img" className="avatar" />


                        <div className="avatar-container-main-item">

                            <p className="chat-title-main">George Alan</p>
                            <p className="active-statu-main">Online</p>
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
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender}`}>
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
                                    <a href={msg.file} download={msg.fileName} className="file-link">
                                        {msg.fileName}
                                    </a>
                                </div>
                            )}
                            <div className="message-info">
                                {msg.sender === "me" ? (
                                    <span className="timestamp-sent">{msg.sentTime}</span>
                                ) : (
                                    msg.receivedTime && <span className="timestamp-received">{msg.receivedTime}</span>
                                )}
                                {msg.status === "sending" ? (
                                    <FaClock className="status-icon" />
                                ) : (
                                    <FaCheck className="status-icon" />
                                )}
                            </div>
                        </div>
                    ))}
                </div>





             

                {/* Input Box */}
                <div className="input-box-chat">
                    <div className="input-icon-container">
                        {/* Button to toggle emoji picker */}
                        <button className="icon-input" onClick={toggleEmojiPicker}>
                            <FaSmile />
                        </button>

                        {/* Emoji picker */}
                        {showEmojiPicker && (
                            <div className="emoji-picker">
                                <EmojiPicker onEmojiClick={handleEmojiClick} />
                            </div>
                        )}

                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: "none" }} id="imageUpload" />
                        <label htmlFor="imageUpload" className="icon-input">
                            <FaImage />
                        </label>

                        <input type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: "none" }} id="videoUpload" />
                        <label htmlFor="videoUpload" className="icon-input">
                            <FaVideo />
                        </label>

                        {/* Thêm phần input file cho việc gửi file */}
                        <input type="file" onChange={handleFileUpload} style={{ display: "none" }} id="fileUpload" />
                        <label htmlFor="fileUpload" className="icon-input">
                            <FaPaperclip />
                        </label>

                        <button className="icon-input">
                            <FaMicrophone />
                        </button>
                    </div>
               
                  

              
                   
                  

                    <div style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "100%",
                        borderRadius: "8px",
                        padding: "10px",
                        paddingTop: (selectedImage && selectedImage.length > 0) ? "80px" : "10px",
                        transition: "padding-top 0.3s ease-in-out",
                        top: "-60px",
                        left: "140px",
                    }}>
                        {Array.isArray(selectedImage) && selectedImage.length > 0 && (
                            <div style={{
                                position: "absolute",
                                top: "10px",
                                display: "flex",
                                gap: "10px",
                                overflowX: "auto",
                                whiteSpace: "nowrap",
                                padding: "5px",
                            }}>
                                {selectedImage.map((image, index) => (
                                    <img key={index} src={image} alt={`uploaded-${index}`}
                                        width="60" height="60"
                                        style={{ objectFit: "cover", borderRadius: "8px" }} />
                                ))}
                            </div>
                        )}
                    </div>


                    <div style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: "100%",
                        borderRadius: "8px",
                        padding: "10px",
                        paddingTop: (selectedImage && selectedImage.length > 0) ? "80px" : "10px",
                        transition: "padding-top 0.3s ease-in-out",
                        top: "-60px",
                        left: "50px",
                    }}>
                    {selectedVideo && (
                        <div style={{
                            position: "absolute",
                            top: "-25px",
                            display: "flex",
                            gap: "10px",
                            overflowX: "auto",
                            whiteSpace: "nowrap",
                            padding: "5px",
                        }}>
                            <video width="60" height="60" controls style={{ borderRadius: "8px" }}>
                                <source src={selectedVideo} type="video/mp4" />
                                Trình duyệt không hỗ trợ video.
                            </video>
                        </div>
                        )}
                    </div>

               

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your message..."
                        className="message-input"
                    />


                    <button onClick={sendMessage} className="send-button">
                        <FaPaperPlane />
                    </button>
                </div>
            </div>

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
