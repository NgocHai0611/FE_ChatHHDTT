import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Linking,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { GiftedChat, Bubble, Send } from "react-native-gifted-chat";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import EmojiSelector from "react-native-emoji-selector";
import Lightbox from "react-native-lightbox";
import {
  uploadFiles,
  getMessages,
  pinMessage,
  recallMessage as recallMessageApi,
  deleteMessageForUser,
  getListFriend,
  createConversation,
  getConversations,
} from "../services/apiServices";
import { useFocusEffect } from "@react-navigation/native";
import io from "socket.io-client";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { v4 as uuidv4 } from "uuid";

export default function InfoChat() {
  return (
    <View>
      <Text>Info Chat Screen</Text>
    </View>
  );
}
