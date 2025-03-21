import "./App.css";
import HomePage from "./Components/Home/HomePage";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import Login from "./Components/Login/Login";
import Register from "./Components/Register/Register";
import Recover from "./Components/Recover/Recover";
import VerifyEmail from "./Components/Register/verifyMail";
import ForgotPassword from "./Components/ForgotPassword/ForgotPassword";
import ChatApp from "./Components/ChatApp/ChatApp";

function App() {
  return (
    <Router>
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
    </Router>
  );
}

export default App;
