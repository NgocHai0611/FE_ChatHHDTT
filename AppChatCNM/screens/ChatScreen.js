import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { GiftedChat, Bubble, Send } from "react-native-gifted-chat";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video, Audio } from "expo-av";
import EmojiSelector from "react-native-emoji-selector";
import Lightbox from "react-native-lightbox";

export default function ChatScreen({ navigation }) {
    const [messages, setMessages] = useState([]);
    const [preview, setPreview] = useState(null);
    const [text, setText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State để hiển thị emoji picker
   
    const onSend = (newMessages = []) => {
        setMessages((prevMessages) => GiftedChat.append(prevMessages, newMessages));
        setText(""); // Xóa nội dung tin nhắn sau khi gửi
        setPreview(null);
    }; 
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

            // Gửi tin nhắn chứa video
            const videoMessage = {
                _id: Math.random().toString(),
                createdAt: new Date(),
                user: { _id: 1 },
                video: result.assets[0].uri, // Gửi video qua tin nhắn
            };

            onSend([videoMessage]);
        }
    };


    const handleFilePick = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: false,
            });

            if (result.canceled) return; // Người dùng hủy chọn file

            let fileUri = "";
            let fileName = "Unknown File";

            // Kiểm tra định dạng mới của Expo Document Picker
            if (result.assets && result.assets.length > 0) {
                fileUri = result.assets[0].uri;
                fileName = result.assets[0].name || fileUri.split("/").pop();
            } else if (result.uri) {
                // Cách cũ: fallback nếu assets không tồn tại
                fileUri = result.uri;
                fileName = result.name || fileUri.split("/").pop();
            }

            console.log("Selected file:", fileUri, "Name:", fileName);

            setPreview({ type: "file", uri: fileUri, name: fileName });
            sendMediaMessage(fileUri, "file", fileName);
        } catch (error) {
            console.error("Error picking document:", error);
        }
    };


    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*", // Chọn tất cả các loại file
                copyToCacheDirectory: false, // Đảm bảo không lưu vào cache
            });

            if (result.canceled) return; // Người dùng hủy chọn file

            console.log("Selected file:", result); // Kiểm tra dữ liệu trả về

            // Kiểm tra nếu `result.assets` tồn tại (định dạng mới của Expo)
            if (result.assets && result.assets.length > 0) {
                const fileUri = result.assets[0].uri;
                const fileName = result.assets[0].name || "Unknown file";
                sendMediaMessage(fileUri, "file", fileName);
            } else if (result.uri) {
                // Cách cũ (trong trường hợp `result.uri` có giá trị)
                const fileName = result.name || result.uri.split("/").pop(); // Lấy tên file từ đường dẫn
                sendMediaMessage(result.uri, "file", fileName);
            } else {
                console.log("Không tìm thấy file name.");
            }
        } catch (error) {
            console.error("Error picking document:", error);
        }
    };

    const sendMediaMessage = (uri, type, fileName = "") => {
        let fileTypeText = fileName ? `📄 ${fileName}` : "📄 Unknown File";

        const mediaMessage = {
            _id: Math.random().toString(),
            createdAt: new Date(),
            user: { _id: 1 },
            image: type === "image" ? uri : undefined,
            video: type === "video" ? uri : undefined,
            text: type === "file" ? fileTypeText : "",
        };

        onSend([mediaMessage]);
    };
    // render tin nhắn video and audio khi gửi tin nhắn
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

    // render xem ảnh 
    const renderMessageImage = (props) => {
        return (
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
    };


 

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Image source={{ uri: "https://randomuser.me/api/portraits/men/1.jpg" }} style={styles.avatar} />
                <View style={styles.nameContainer}>
                    <Text style={styles.name}>George Alan</Text>
                    <Text style={styles.online}>Online</Text>
                </View>
                <View style={styles.iconContainer}>
                    <MaterialIcons name="call" size={24} color="black" style={styles.icon} />
                    <MaterialIcons name="videocam" size={24} color="black" style={styles.icon} />
                    <MaterialIcons name="info-outline" size={24} color="black" style={styles.icon}  />
                </View>
            </View>

            {/* Xem trước file */}
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
                messages={messages}
                onSend={(newMessages) => onSend(newMessages)}
                user={{ _id: 1 }}
                text={text} // Gán text vào GiftedChat
                onInputTextChanged={setText} // Cập nhật text khi nhập
                renderMessageVideo={renderMessageVideo} // Thêm renderMessageVideo
                renderMessageImage={renderMessageImage}
                renderBubble={(props) => (
                    <Bubble
                        {...props}
                        wrapperStyle={{
                            right: { backgroundColor: "#7B61FF", padding: 5 },
                            left: { backgroundColor: "#F2F2F2", padding: 5 },
                        }}
                        textStyle={{
                            right: { color: "#fff" },
                            left: { color: "#000" },
                        }}
                    />
                )}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 10 },
    nameContainer: { flex: 1, marginLeft: 10 },
    name: { fontSize: 16, fontWeight: "bold" },
    online: { fontSize: 14, color: "green" },
    iconContainer: { flexDirection: "row" },
    icon: { marginLeft: 15 },
    actionContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#fff",
    },
    actionButton: { marginHorizontal: 5 },
    sendButton: { marginRight: 10, marginBottom: 5 },
    previewContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    previewImage: { width: 100, height: 100, borderRadius: 10 },
    previewVideo: { width: 100, height: 100, borderRadius: 10 },
    previewText: { marginLeft: 10, fontSize: 16 },
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
});

