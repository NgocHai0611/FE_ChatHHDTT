import axios  from "axios";
import { forgotPasswordFailed, forgotPasswordStart, forgotPasswordSuccess, loginFailed, loginStart, loginSuccess, logoutFailed, logoutStart, logoutSuccess, registerFailed, registerStart, registerSuccess, resetPasswordFailed, resetPasswordStart, resetPasswordSuccess } from "./authSlice";

export const loginUser = async (user, dispatch, navigate, setError) => {
    dispatch(loginStart());
    try {
        const res = await axios.post("/v1/auth/login", user);

        // Check if there is any error message from the backend
        if (res.data.message) {
            setError(res.data.message); // Set error message
            dispatch(loginFailed());
            return;
        }

        dispatch(loginSuccess(res.data));
        navigate("/"); // Redirect to homepage
    } catch (error) {
        console.log(error);
         // Kiểm tra lỗi trả về từ API
         if (error.response) {
            // Lỗi trả về từ server
            const errorMessage = error.response.data?.message || "Đăng nhập thất bại. Vui lòng thử lại.";
            setError(errorMessage);
        } else if (error.request) {
            // Lỗi không nhận được phản hồi từ server
            setError("Không nhận được phản hồi từ server. Vui lòng thử lại.");
        } else {
            // Lỗi khác
            setError("Đã xảy ra lỗi. Vui lòng thử lại.");
        }

        dispatch(loginFailed());
    
    }
};


export const registerUser = async (user, dispatch, navigate, setFeedbackMessage) => {
    dispatch(registerStart());
    try {
        await axios.post("/v1/auth/register", user);
        dispatch(registerSuccess());
        setFeedbackMessage("Registration successful! Please check your email for verification.");
        navigate("/login");
    } catch (error) {
        dispatch(registerFailed());
        setFeedbackMessage(error.response?.data?.message || "Registration failed. Please try again.");
    }
};



export const logout= async(dispatch,id,navigate,accessToken,axiosJWT) =>{

    dispatch(logoutStart());
    try {
         await axiosJWT.post("/v1/auth/logout",id,{
            headers: {token: `Bearer ${accessToken}`}

         })
        dispatch(logoutSuccess());
        navigate("/login")
    
    } catch (error) {
        dispatch(logoutFailed());
    }
}

export const forgotPassword = async (email, dispatch, setFeedbackMessage) => {
    dispatch(forgotPasswordStart());
    try {
        const res = await axios.post("/v1/auth/forgot-password", { email });

        dispatch(forgotPasswordSuccess(res.data.message));
        setFeedbackMessage(res.data.message);  // You can set a success message to display to the user
    } catch (error) {
        const errorMessage = error.response?.data?.message || "Something went wrong, please try again.";
        dispatch(forgotPasswordFailed(errorMessage));
        setFeedbackMessage(errorMessage);  // Set the error message to display to the user
    }
};

export const resetPassword = async (token, newPassword, confirmPassword, dispatch, navigate, setFeedbackMessage) => {
    dispatch(resetPasswordStart());
    try {
        // Gửi yêu cầu POST tới API reset mật khẩu với token trong URL và mật khẩu mới trong body
        const res = await axios.post(`/v1/auth/reset-password/${token}`, { newPassword,confirmPassword  });

        // Nếu thành công, dispatch action thành công và hiển thị thông báo thành công
        dispatch(resetPasswordSuccess(res.data.message));
        setFeedbackMessage(res.data.message);  // Hiển thị thông báo thành công cho người dùng
        navigate("/login");  // Chuyển hướng đến trang đăng nhập (hoặc trang nào đó bạn muốn)
    } catch (error) {
        // Nếu có lỗi, dispatch action thất bại và hiển thị thông báo lỗi
        const errorMessage = error.response?.data?.message || "Something went wrong, please try again.";
        dispatch(resetPasswordFailed(errorMessage));
        setFeedbackMessage(errorMessage);  // Hiển thị thông báo lỗi cho người dùng
    }
};