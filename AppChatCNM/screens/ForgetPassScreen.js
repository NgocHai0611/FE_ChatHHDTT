import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import axios from 'axios';

export default function ForgetPassScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // Xử lý gửi yêu cầu quên mật khẩu
  const handleForgotPassword = async () => {
    if (!email) {
      setModalMessage("Vui lòng nhập email.");
      setModalVisible(true);
      return;
    }

    try {
      const response = await axios.post("http://localhost:8004/v1/auth/forgot-password", { email });

      setModalMessage(response.data.message);
      setModalVisible(true);
    } catch (error) {
      setModalMessage(error.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
      setModalVisible(true);
    }
  };

  return (
    <LinearGradient
      colors={["#9AB9F5", "#FFFFFF"]}
      locations={[0, 0.25]}
      start={{ x: 0, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      style={styles.container}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.title}>Quên mật khẩu</Text>
      <TextInput
        style={styles.input}
        placeholder="Nhập email của bạn"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.resetButton} onPress={handleForgotPassword}>
        <Text style={styles.buttonText}>Gửi yêu cầu</Text>
      </TouchableOpacity>

      <Modal 
        transparent={true}
        visible={isModalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 30, backgroundColor: "#F8F8F8" },
  backButton: { position: "absolute", top: 50, left: 20 },
  title: { fontSize: 24, textAlign: "center", marginBottom: 20 },
  input: { height: 50, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, fontSize: 16, marginBottom: 20, backgroundColor: "#FFFFFF" },
  resetButton: { height: 50, borderRadius: 10, backgroundColor: "#007AFF", justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: 300, padding: 20, backgroundColor: 'white', borderRadius: 10, alignItems: 'center' },
  modalMessage: { marginBottom: 15, textAlign: 'center' },
  modalButton: { padding: 10, backgroundColor: '#007AFF', borderRadius: 5 },
  modalButtonText: { color: 'white', fontWeight: 'bold' },
});
