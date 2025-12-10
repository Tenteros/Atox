import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import "./login.css";



const Login = () => {
    const [currentView, setCurrentView] = useState("login"); // "login", "register", "verification"
    const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);

    // Сохранение данных форм
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [registerUsername, setRegisterUsername] = useState("");
    const [registerEmail, setRegisterEmail] = useState("");
    const [registerPassword, setRegisterPassword] = useState("");


    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);

    const inputRefs = useRef([]);


    const handleRegisterSubmit = (e) => {
        e.preventDefault();
        setOtpCode(["", "", "", "", "", ""]); // Сброс кода
        setCurrentView("verification");
    };

    const handleBackToRegister = () => {
        setCurrentView("register");
    };

    const handleOtpChange = (index, value) => {
        // Разрешаем только цифры
        if (value && !/^\d+$/.test(value)) {
            return;
        }

        const newOtpCode = [...otpCode];
        newOtpCode[index] = value.slice(-1);
        setOtpCode(newOtpCode);


        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {

        if (e.key === "Backspace" && !otpCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text");
        const digits = pastedData.replace(/\D/g, "").slice(0, 6);

        if (digits.length > 0) {
            const newOtpCode = [...otpCode];
            for (let i = 0; i < digits.length && i < 6; i++) {
                newOtpCode[i] = digits[i];
            }
            setOtpCode(newOtpCode);


            const nextEmptyIndex = Math.min(digits.length, 5);
            inputRefs.current[nextEmptyIndex]?.focus();
        }
    };

    const handleCodeVerify = () => {
        const code = otpCode.join("");
        console.log("Verification code:", code);
    };

    const isCodeComplete = otpCode.every(digit => digit !== "");

    return (
        <div className="auth-container">
            {/* Background image */}
            <div className="background-image">
                <img
                    src="/images/priroda_ozero_les_167639_2560x1440.webp"
                    alt="Nature background"
                    className="background-img"
                />
            </div>

            {currentView === "login" ? (
                <div className="login-form">
                    <h1>Login</h1>
                    <p>Welcome back!</p>
                    <form className="form" onSubmit={(e) => e.preventDefault()}>
                        <div>
                            <label>Email</label>
                            <input
                                className="input-email"
                                type="email"
                                placeholder="Email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label>Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    className="input-password"
                                    type={showLoginPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                                >
                                    {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button className="btn-submit" type="submit">Login</button>
                    </form>
                    <div className="switch-section">
                        <p>Don't have an account?</p>
                        <a href="#" onClick={() => setCurrentView("register")}>Create one</a>
                    </div>
                </div>
            ) : currentView === "register" ? (
                <div className="register-form">
                    <h1>Registration</h1>
                    <p>Register to start chatting</p>
                    <form className="form" onSubmit={handleRegisterSubmit}>
                        <div>
                            <label>Username</label>
                            <input
                                className="input-username"
                                type="text"
                                placeholder="Username"
                                value={registerUsername}
                                onChange={(e) => setRegisterUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label>Email</label>
                            <input
                                className="input-email"
                                type="email"
                                placeholder="Email"
                                value={registerEmail}
                                onChange={(e) => setRegisterEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label>Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    className="input-password"
                                    type={showRegisterPassword ? "text" : "password"}
                                    placeholder="Password"
                                    value={registerPassword}
                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                    aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                                >
                                    {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button className="btn-submit" type="submit">Register</button>
                    </form>
                    <div className="switch-section">
                        <p>Already have an account?</p>
                        <a href="#" onClick={() => setCurrentView("login")}>Login</a>
                    </div>
                </div>
            ) : (
                /* Verification Code Form */
                <div className="verification-form">
                    <button
                        className="back-button"
                        onClick={handleBackToRegister}
                        aria-label="Back to registration"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <h1>Email Verification</h1>
                    <p className="verification-description">
                        We've sent a 6-digit verification code to
                    </p>
                    <p className="verification-email">
                        <strong>{registerEmail}</strong>
                    </p>
                    <button
                        className="change-email-btn"
                        onClick={handleBackToRegister}
                    >
                        Change email
                    </button>

                    <div className="otp-container">
                        {otpCode.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className="otp-input"
                            />
                        ))}
                    </div>

                    <button
                        className="btn-submit btn-verify"
                        onClick={handleCodeVerify}
                        disabled={!isCodeComplete}
                    >
                        Verify Code
                    </button>

                    <p className="resend-text">
                        Didn't receive the code? <a href="#" className="resend-link">Resend</a>
                    </p>
                </div>
            )}
        </div>
    );
};

export default Login;