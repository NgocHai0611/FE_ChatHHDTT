import axios from "axios";

const API_BASE_URL = "http://192.168.1.218:8004"; // thay bằng địa chỉ server

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
