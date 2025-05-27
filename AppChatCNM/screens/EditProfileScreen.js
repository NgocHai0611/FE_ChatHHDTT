import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { fetchUpdatedUser } from '../services/apiServices';
import io from 'socket.io-client';

// Khởi tạo socket
const socket = io('https://bechatcnm-production.up.railway.app', {
  transports: ['websocket'],
});

export default function EditProfileScreen({ route, navigation }) {
  const { user } = route.params;
  const [username, setUsername] = useState(user.username || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [secureText, setSecureText] = useState(true);
  const [errors, setErrors] = useState({ username: '', phone: '', password: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Hàm đồng bộ dữ liệu từ server
  const syncUserData = useCallback(async () => {
    if (!user?._id || isUpdating) return;

    try {
      const updatedUser = await fetchUpdatedUser(user._id);
      // So sánh dữ liệu và cập nhật đồng thời
      if (
        updatedUser.username !== username ||
        updatedUser.phone !== phone ||
        updatedUser.avatar !== avatar
      ) {
        setUsername(updatedUser.username);
        setPhone(updatedUser.phone);
        setAvatar(updatedUser.avatar);

        // Cập nhật AsyncStorage
        const storedUser = JSON.parse(await AsyncStorage.getItem('user'));
        const updatedStoredUser = {
          ...storedUser,
          username: updatedUser.username,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar,
        };
        await AsyncStorage.setItem('user', JSON.stringify(updatedStoredUser));
      }
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  }, [user?._id, username, phone, avatar, isUpdating]);

  // Lắng nghe cập nhật từ socket
  useEffect(() => {
    if (!user?._id) return;

    const eventName = `user_updated_${user._id}`;
    socket.on(eventName, () => {
      syncUserData();
    });

    return () => {
      socket.off(eventName);
    };
  }, [user?._id, syncUserData]);

  // Polling dự phòng
  useEffect(() => {
    if (!user?._id || isUpdating) return;

    const interval = setInterval(syncUserData, 5000);

    return () => clearInterval(interval);
  }, [user?._id, isUpdating, syncUserData]);

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
      setIsUpdating(true);
    }
  };

  const validateInputs = () => {
    let isValid = true;
    const newErrors = { username: '', phone: '', password: '' };

    const usernameRegex = /^[\p{L}\s]+$/u;
    if (!username) {
      newErrors.username = 'Tên người dùng không được để trống.';
      isValid = false;
    } else if (!usernameRegex.test(username)) {
      newErrors.username = 'Tên người dùng chỉ được chứa chữ cái và khoảng trắng.';
      isValid = false;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      newErrors.phone = 'Số điện thoại phải có đúng 10 chữ số.';
      isValid = false;
    }

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
      setIsLoading(true);
      setIsUpdating(true);

      const formData = new FormData();
      formData.append('username', username);
      formData.append('phone', phone);
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

      await api.put(`/users/update/${user._id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Lấy dữ liệu mới nhất từ server
      const latestUser = await fetchUpdatedUser(user._id);
      // Cập nhật state đồng thời
      setUsername(latestUser.username);
      setPhone(latestUser.phone);
      setAvatar(latestUser.avatar);
      setPassword('');
      setIsUpdating(false);
      setIsLoading(false);

      // Cập nhật AsyncStorage với dữ liệu đầy đủ
      const updatedUser = {
        ...user,
        username: latestUser.username,
        phone: latestUser.phone,
        avatar: latestUser.avatar,
        email: latestUser.email || user.email,
        accessToken: accessToken,
        _id: user._id,
      };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Gửi sự kiện socket
      socket.emit('user_updated', { userId: user._id });

      Alert.alert('Thành công', 'Cập nhật thông tin thành công!', [
        {
          text: 'OK',
          onPress: () => {
            // Truyền updatedUser đầy đủ về ChatListScreen
            navigation.navigate('ChatListScreen', { updatedUser });
          },
        },
      ]);
    } catch (error) {
      setIsUpdating(false);
      setIsLoading(false);
      console.error('Error updating profile:', error);
      Alert.alert('Lỗi', error.response?.data?.error || 'Cập nhật thất bại.');
    }
  };

  return (
    <View style={styles.container}>
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
              setIsUpdating(true);
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
              setIsUpdating(true);
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
                setIsUpdating(true);
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

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleUpdate}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Cập nhật</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

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
  buttonDisabled: {
    backgroundColor: '#99ccff',
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