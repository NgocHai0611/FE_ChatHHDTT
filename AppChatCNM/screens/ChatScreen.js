import React, { useState, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { GiftedChat, Bubble, Actions, Send } from "react-native-gifted-chat";
import { Ionicons, MaterialIcons, FontAwesome } from "@expo/vector-icons";

export default function ChatScreen({ navigation }) {
    const [messages, setMessages] = useState([
        {
            _id: 1,
            text: "Sure! Sending them over now.",
            createdAt: new Date(),
            user: { _id: 2, name: "George Alan", avatar: "https://randomuser.me/api/portraits/men/1.jpg" },
        },
        {
            _id: 2,
            text: "I'll take it. Can you ship it?",
            createdAt: new Date(),
            user: { _id: 1 },
        },
        {
            _id: 3,
            text: "Thanks! Looks good.",
            createdAt: new Date(),
            user: { _id: 1 },
        },
    ]);


    const onSend = (newMessages = []) => {
        setMessages((prevMessages) => GiftedChat.append(prevMessages, newMessages));
    };

    // Hàm xử lý gửi hình ảnh, file, voice
    const handleImagePick = () => {
        console.log("Gửi hình ảnh");
    };

    const handleFilePick = () => {
        console.log("Gửi file");
    };

    const handleVoiceRecord = () => {
        console.log("Ghi âm");
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
                    <MaterialIcons name="info-outline" size={24} color="black" />
                </View>
            </View>

            {/* Chat */}
            <GiftedChat
                messages={messages}
                onSend={(newMessages) => onSend(newMessages)}
                user={{ _id: 1 }}
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
                        renderTicks={() => (
                            <View style={{ flexDirection: "row", alignSelf: "flex-end", marginRight: 5 }}>
                                <Ionicons name="checkmark-done" size={14} color="white" />
                            </View>
                        )}
                    />
                )}
                renderActions={(props) => (
                    <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 5, backgroundColor: "#fff", padding: 10 }}>
                        {/* Gửi hình ảnh */}
                        <TouchableOpacity onPress={handleImagePick} style={{ marginHorizontal: 5 }}>
                            <MaterialIcons name="image" size={24} color="#7B61FF" />
                        </TouchableOpacity>

                        {/* Gửi file */}
                        <TouchableOpacity onPress={handleFilePick} style={{ marginHorizontal: 5 }}>
                            <MaterialIcons name="attach-file" size={24} color="#7B61FF" />
                        </TouchableOpacity>

                        {/* Ghi âm */}
                        <TouchableOpacity onPress={handleVoiceRecord} style={{ marginHorizontal: 5 }}>
                            <FontAwesome name="microphone" size={24} color="#7B61FF" />
                        </TouchableOpacity>

                        {/* Gửi icon */}
                        <TouchableOpacity onPress={() => console.log("Chọn icon")} style={{ marginHorizontal: 5 }}>
                            <Ionicons name="happy-outline" size={24} color="#7B61FF" />
                        </TouchableOpacity>
                    </View>
                )}
                renderSend={(props) => (
                    <Send {...props}>
                        <View style={{ marginRight: 10, marginBottom: 5 }}>
                            <Ionicons name="send" size={24} color="#7B61FF" />
                        </View>
                    </Send>
                )}
            />

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    avatar: { width: 40, height: 40, borderRadius: 20, marginLeft: 10 },
    name: { fontSize: 16, fontWeight: "bold" },
    online: { fontSize: 12, color: "green" },
    iconContainer: { flexDirection: "row", marginLeft: "auto" },
    icon: { marginHorizontal: 10 },
    nameContainer: {
        marginLeft: 10,
    }
});
