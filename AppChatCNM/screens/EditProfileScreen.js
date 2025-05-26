import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { fetchUpdatedUser } from '../services/apiServices';

export default function EditProfileScreen({ route, navigation }) {
  const { user } = route.params;
  const [username, setUsername] = useState(user.username || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [secureText, setSecureText] = useState(true);
  const [errors, setErrors] = useState({ username: '', phone: '', password: '' });
  const [isUpdating, setIsUpdating] = useState(false); // Track if user is editing profile

  // Polling for avatar updates every 2 seconds
  useEffect(() => {
    if (!user?._id || isUpdating) return;

    let lastFetchTime = 0;
    const minInterval = 2000; // Minimum interval of 2 seconds between fetches

    const fetchAvatar = async () => {
      const now = Date.now();
      if (now - lastFetchTime < minInterval) return; // Prevent fetching too quickly
      lastFetchTime = now;

      try {
        const updatedUser = await fetchUpdatedUser(user._id);
        // Only update avatar if it has changed
        if (updatedUser.avatar !== avatar && updatedUser.avatar !== user.avatar) {
          setAvatar(updatedUser.avatar);
        }
      } catch (error) {
        console.error("Error refreshing avatar:", error);
      }
    };

    fetchAvatar(); // Initial fetch
    const interval = setInterval(fetchAvatar, 2000); // Check every 2 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [user?._id, avatar, user.avatar, isUpdating]);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Quyền truy cập bị từ chối', 'Vui lòng cấp quyền truy cập thư viện ảnh.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setIsUpdating(true); // Mark as updating when new avatar is selected
    }
  };

  const validateInputs = () => {
    let isValid = true;
    const newErrors = { username: '', phone: '', password: '' };

    // Ràng buộc tên người dùng: Chỉ chứa chữ cái (bao gồm dấu tiếng Việt) và khoảng trắng
    const usernameRegex = /^[\p{L}\s]+$/u;
    if (!username) {
      newErrors.username = 'Tên người dùng không được để trống.';
      isValid = false;
    } else if (!usernameRegex.test(username)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái và khoảng trắng, không chứa số hoặc ký tự đặc biệt.';
      isValid = false;
    }

    // Ràng buộc số điện thoại
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      newErrors.phone = 'Số điện thoại phải có đúng 10 chữ số.';
      isValid = false;
    }

    // Nếu nhập mật khẩu, kiểm tra độ dài tối thiểu
    if (password && password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleUpdate = async () => {
    if (!validateInputs()) {
      return;
    }

    try {
      setIsUpdating(true); // Mark as updating
      const formData = new FormData();
      formData.append('username', username);
      formData.append('phone', phone);
      // Chỉ thêm password vào FormData nếu người dùng nhập mật khẩu mới
      if (password) {
        formData.append('password', password);
      }
      if (avatar && avatar !== user.avatar) {
        formData.append('avatar', {
          uri: avatar,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
      }

      const token = await AsyncStorage.getItem('user');
      const accessToken = JSON.parse(token).accessToken;

      const response = await api.put(`/users/update/${user._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Fetch latest user data from server to ensure sync
      const latestUser = await fetchUpdatedUser(user._id);
      const updatedUser = {
        ...user,
        username: latestUser.username,
        phone: latestUser.phone,
        avatar: latestUser.avatar,
        email: latestUser.email || user.email,
        accessToken: accessToken, // Preserve access token
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Update state and reset isUpdating
      setUsername(latestUser.username);
      setPhone(latestUser.phone);
      setAvatar(latestUser.avatar);
      setPassword(''); // Clear password field
      setIsUpdating(false); // Allow polling to resume

      Alert.alert('Thành công', 'Cập nhật thông tin thành công!', [
        {
          text: 'OK',
          onPress: () => {
            // Chuyển về ChatListScreen và truyền updatedUser
            navigation.navigate('ChatListScreen', { updatedUser });
          },
        },
      ]);
    } catch (error) {
      setIsUpdating(false); // Reset isUpdating on error
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', error.response?.data?.message || 'Cập nhật thất bại.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Back Arrow Icon */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                avatar ||
                'https://res.cloudinary.com/dapvuniyx/image/upload/v1744161405/chat_app_Uploads/yk4kcxxugoaepkfyhkxz.jpg',
            }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Thông tin cá nhân</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tên người dùng</Text>
          <TextInput
            style={[styles.input, errors.username && styles.inputError]}
            placeholder="Ví dụ: Mai Quốc Trưởng"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setErrors({ ...errors, username: '' });
            }}
          />
          {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            placeholder="Số điện thoại (10 số)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              setErrors({ ...errors, phone: '' });
            }}
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nhập mật khẩu mới (nếu muốn thay đổi)"
              secureTextEntry={secureText}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors({ ...errors, password: '' });
              }}
            />
            <TouchableOpacity onPress={() => setSecureText(!secureText)}>
              <Ionicons
                name={secureText ? 'eye-off' : 'eye'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Cập nhật</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Styles giữ nguyên
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: '40%',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: 'red',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
};