import "./App.css";
import HomePage from "./Components/Home/HomePage";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Login from "./Components/Login/Login";
import Register from "./Components/Register/Register";
import NavBar from "./Components/NavBar/NavBar";
import Recover from "./Components/Recover/Recover";
import VerifyEmail from "./Components/Register/verifyMail";
import ForgotPassword from "./Components/ForgotPassword/ForgotPassword";
import ChatApp from "./Components/ChatApp/ChatApp";
// Component để kiểm tra và hiển thị NavBar
const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavBarPaths = ["/login", "/register", "/recover","/reset-password","/verify-email", "chat-app"];
   // Kiểm tra xem đường dẫn hiện tại có bắt đầu với các path trong hideNavBarPaths không
   const shouldHideNavBar = hideNavBarPaths.some(path => location.pathname.startsWith(path));
  return (
    <>
     {/* Chỉ hiển thị NavBar nếu không nằm trong danh sách ẩn */}
     {!shouldHideNavBar && <NavBar />}
      {children}
    </>
  );
};

function App() {
  return (
    <Router>
      <Layout>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password/:token" element={<Recover />} />
            <Route path="/recover" element={<ForgotPassword />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/chat-app" element={<ChatApp />} />
          </Routes>
        </div>
      </Layout>
    </Router>
  );
}

export default App;
