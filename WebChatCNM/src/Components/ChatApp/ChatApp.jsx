import { useState } from "react";
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
    FaPaperclip, FaMicrophone, FaImage, FaSmile, FaClock, FaCheck// Icon Groups
} from "react-icons/fa";

import "./chatApp.css"; // Import file CSS

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
    const [selectedImage, setSelectedImage] = useState(null);

    // Xử lý gửi tin nhắn hoặc ảnh
    const sendMessage = () => {
        if (input.trim() || selectedImage) {
            const newMessage = {
                text: input,
                sender: "me",
                sentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                receivedTime: null,
                status: "sending",
                image: selectedImage,
            };

            setMessages([...messages, newMessage]);

            // Giả lập trạng thái "sent" và thiết lập thời gian nhận sau 1 giây
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
        }
    };

    // Xử lý chọn ảnh
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file); // Tạo URL ảnh tạm thời để hiển thị
            setSelectedImage(imageUrl);
        }
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
                <div className="icon-container">
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

                        <img src="https://randomuser.me/api/portraits/men/1.jpg" className="avatar" />


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
                            {msg.image && <img src={msg.image} alt="sent" className="chat-image" />}
                            <div className="message-info">
                                {msg.sender === "me" ? (
                                    <span className="timestamp-sent">{msg.sentTime}</span>
                                ) : (
                                    msg.receivedTime && (
                                        <span className="timestamp-received">{msg.receivedTime}</span>
                                    )
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
                        <button className="icon-input">
                            <FaSmile />
                        </button>
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} id="imageUpload" />
                        <label htmlFor="imageUpload" className="icon-input">
                            <FaImage />
                        </label>

                        <button className="icon-input">
                            <FaPaperclip />
                        </button>
                        <button className="icon-input">
                            <FaMicrophone />
                        </button>

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
        </div>
    );
}
