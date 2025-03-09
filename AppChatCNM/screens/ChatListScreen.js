import React, { useState } from "react";

import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ScrollView } from "react-native";
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { TextInput } from "react-native-gesture-handler";

const chats = [
    {
        id: "1",
        name: "George Alan",
        lastMessage: "📄 Document",
        time: "4:30 PM",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        isOnline: true,
        unreadMessages: 2
    },
    {
        id: "2",
        name: "Uber Cars",
        lastMessage: "Allen: Your ride is 2 minutes away...",
        time: "4:30 PM",
        avatar: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png",
        isOnline: false,
        unreadMessages: 0
    },
    {
        id: "3",
        name: "Safiya Fareena",
        lastMessage: "📹 Video",
        time: "3:50 PM",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg",
        isOnline: true,
        unreadMessages: 1
    },
    {
        id: "4",
        name: "Emily Carter",
        lastMessage: "Hey, how are you? 😊",
        time: "3:30 PM",
        avatar: "https://randomuser.me/api/portraits/women/3.jpg",
        isOnline: false,
        unreadMessages: 3
    },
    {
        id: "5",
        name: "John Doe",
        lastMessage: "Let's meet tomorrow",
        time: "2:45 PM",
        avatar: "https://randomuser.me/api/portraits/men/5.jpg",
        isOnline: true,
        unreadMessages: 0
    },
    {
        id: "6",
        name: "Sarah Connor",
        lastMessage: "🔥 Party tonight?",
        time: "1:15 PM",
        avatar: "https://randomuser.me/api/portraits/women/6.jpg",
        isOnline: false,
        unreadMessages: 5
    },
    {
        id: "7",
        name: "David Smith",
        lastMessage: "📍 Location sent",
        time: "12:30 PM",
        avatar: "https://randomuser.me/api/portraits/men/7.jpg",
        isOnline: true,
        unreadMessages: 2
    },
    {
        id: "8",
        name: "Lisa Brown",
        lastMessage: "Call me back",
        time: "11:45 AM",
        avatar: "https://randomuser.me/api/portraits/women/8.jpg",
        isOnline: false,
        unreadMessages: 4
    },
];






export default function ChatListScreen({ navigation }) {
    const [hoveredId, setHoveredId] = useState(null); // Lưu ID item đang hover
    return (
        
        <View style={styles.container}>
            
            <View style={styles.header}>
                <Image source={{ uri: `https://randomuser.me/api/portraits/women/2.jpg` }} style={styles.avatar} />
                <Text style={styles.title}>Chats</Text>
            </View>
            <View style={styles.inputContainer}>
                <TouchableOpacity style={ styles.iconAddFriend }> 
                    <MaterialIcons name="person-add" size={30} color="gray" />
                </TouchableOpacity>
                <View style={styles.iconSearch}>
                    <TouchableOpacity style={styles.iconSearchTouch}>
                        <FontAwesome name="search" size={20} color="gray" style={styles.icon} />
                        <TextInput
                            placeholder="Search"
                            style={styles.input}
                            placeholderTextColor={"#000"}
                        />
                    </TouchableOpacity>
                </View>

            </View>
                <ScrollView style={styles.scrollView}>
                    {chats.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.chatItem,
                                hoveredId === item.id && styles.chatItemHover,
                            ]}
                            onPressIn={() => setHoveredId(item.id)}
                            onPressOut={() => setHoveredId(null)}
                            onPress={() => navigation.navigate("ChatScreen", { chatData: item })} // Chuyển dữ liệu sang màn hình ChatScreen
                        >
                            <View style={styles.avatarContainer}>
                                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                                {item.isOnline && <View style={styles.onlineIndicator} />}
                            </View>
                            <View style={styles.chatDetails}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.lastMessage}>{item.lastMessage}</Text>
                            </View>
                            <View style={styles.chatMeta}>
                                <Text style={styles.time}>{item.time}</Text>
                                {item.unreadMessages > 0 && (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadText}>{item.unreadMessages}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
            </ScrollView>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.iconFooter}>
                    <MaterialIcons name="chat" size={30} color="#b73bff" />
                    <Text style={styles.textFooter}>
                        Chats
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconFooter}>
                    <MaterialIcons name="phone" size={30} color="gray" />
                    <Text style={styles.textFooter}>
                        Calls
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconFooter}>
                    <MaterialIcons name="person" size={30} color="gray" />
                    <Text style={styles.textFooter}>
                        Users
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconFooter}>
                    <MaterialIcons name="group" size={30} color="gray" />
                    <Text style={styles.textFooter}>
                        Groups
                    </Text>
                </TouchableOpacity>

            </View>
            </View>
       
    );
}

const styles = StyleSheet.create({
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        backgroundColor: "#fff", // Màu nền mặc định
    },
    chatItemHover: {
        backgroundColor: "#f0f0f0", // Màu khi hover
    },
    avatarContainer: {
        position: "relative",
    },
    avatar: {
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
        flex: 1,
        marginLeft: 15,
    },
    name: {
        fontSize: 16,
        fontWeight: "bold",
    },
    lastMessage: {
        fontSize: 14,
        color: "gray",
    },
    chatMeta: {
        alignItems: "flex-end",
    },
    time: {
        fontSize: 12,
        color: "gray",
    },
    unreadBadge: {
        marginTop: 5,
        backgroundColor: "red",
        borderRadius: 10,
        paddingVertical: 3,
        paddingHorizontal: 8,
    },
    unreadText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "bold",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
       
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
        justifyContent: "space-between",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
    }, inputContainer: {
        flexDirection: "row",
        padding: 15,
       
        borderTopWidth: 1,
        borderColor: "#ddd",
        alignItems: "center",
    }, iconSearch: {
        backgroundColor: "#f5f5f5",
        borderRadius: 20,
        width: "90%",
        alignSelf: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: 20,
    },
    iconSearchTouch: {
        flexDirection: "row", // Căn theo chiều ngang
        alignItems: "center", // Căn giữa theo chiều dọc
        justifyContent: "flex-start", // Để icon và text nằm sát nhau
    },
    icon: {
        marginRight: 8, // Tạo khoảng cách giữa icon và TextInput
    },
    input: {
        flex: 1, // Để TextInput chiếm hết phần còn lại
        fontSize: 16,
        color: "#333",
        paddingVertical: 7,
        width: "100%",
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    scrollView: {
        width: "100%",
        height: 500,
    },
    footer: {
        padding: 20,
        backgroundColor: "rgba(255,255,255,255)",
        flexDirection: "row",
        justifyContent: "space-between",
        borderTopWidth: 1,
        borderColor: "#ddd",
        position: "fixed",
        bottom: 0,
        width: "100%",
        alignItems: "center",
    },
    textFooter: {
        fontSize: 12,
        color: "gray",
        alignContent: "center",
        
    },
});
