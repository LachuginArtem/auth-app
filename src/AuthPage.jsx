import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { FaVk } from "react-icons/fa";
import {
    EnvelopeIcon,
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
    UserIcon,
    GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { api, loginUser, registerUser, getOAuthUrl, handleOAuthAuthentication } from './services/apiService';
import yandexLogo from "./assets/yandex-logo.png";
import "./styles.css";

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [isVkLoading, setIsVkLoading] = useState(false);
    const [isYandexLoading, setIsYandexLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const hasProcessedCallback = useRef(false);

    const realm = searchParams.get("realm") || "default";
    const redirectUri = searchParams.get("redirect_uri");

    const isValidRedirectUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };

    const handleRedirect = (url, access_token) => {
        try {
            if (!isValidRedirectUrl(url)) {
                throw new Error("Invalid redirect URL");
            }

            // Создаем новый URL объект для редиректа
            const redirectUrl = new URL(url);

            // Проверяем, является ли URL внешним (другой домен или порт)
            const isExternalRedirect =
                redirectUrl.origin !== window.location.origin ||
                redirectUrl.port !== window.location.port;

            if (isExternalRedirect) {
                // Для внешнего редиректа добавляем токен в URL
                redirectUrl.searchParams.set('access_token', access_token);
                console.log("[AuthPage] External redirect to:", redirectUrl.toString());
                window.location.replace(redirectUrl.toString());
            } else {
                // Для внутреннего редиректа используем navigate
                console.log("[AuthPage] Internal redirect to:", redirectUrl.pathname);
                navigate(redirectUrl.pathname);
            }
        } catch (error) {
            console.error("[AuthPage] Redirect error:", error);
            toast.error("Ошибка при перенаправлении");
        }
    };

    useEffect(() => {
        console.log("[AuthPage] Component mounted, URL:", window.location.href);
        console.log("[AuthPage] Redirect URI:", redirectUri);
        console.log("[AuthPage] Realm:", realm);

        if (!hasProcessedCallback.current) {
            const code = searchParams.get("code");
            const state = searchParams.get("state");
            const cid = searchParams.get("cid");

            if (code && state) {
                console.log("[AuthPage] Processing OAuth callback:", { code, state, cid });
                hasProcessedCallback.current = true;
                processOAuthCallback(code, state, cid);
            }
        }
    }, [searchParams, redirectUri, realm]);

    const handleTokens = (data) => {
        const { access_token, refresh_token, expires_at, session_id } = data;

        if (typeof access_token !== "string" || typeof refresh_token !== "string") {
            console.error("[AuthPage] Invalid tokens:", { access_token, refresh_token });
            throw new Error("Invalid tokens received");
        }

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("expires_at", expires_at || "");
        localStorage.setItem("session_id", session_id || "");

        console.log("[AuthPage] Tokens saved to localStorage");
        return access_token;
    };

    const clearOAuthState = (provider) => {
        localStorage.removeItem(`${provider}_session_id`);
        localStorage.removeItem(`${provider}_action`);
        localStorage.removeItem(`${provider}_state`);
        localStorage.removeItem(`${provider}_state_data`);
        console.log("[AuthPage] Cleared OAuth state from localStorage for provider:", provider);
    };

    const processOAuthCallback = async (code, state, cid) => {
        const provider = cid ? "yandex" : "vk";
        const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
        setLoading(true);
        console.log("[AuthPage] Processing OAuth callback for provider:", provider);

        try {
            const { data } = await handleOAuthAuthentication(code, state, cid, realm, provider);
            console.log("[AuthPage] OAuth authentication successful:", data);

            const access_token = handleTokens(data);
            toast.success(`Вход через ${provider === "vk" ? "ВКонтакте" : "Яндекс"} успешен!`);

            clearOAuthState(provider);

            // Получаем сохраненный state и проверяем redirect_uri
            const savedStateData = localStorage.getItem(`${provider}_state_data`);
            let redirectTo;

            try {
                const stateData = JSON.parse(savedStateData);
                redirectTo = stateData.redirect_uri;
                console.log("[AuthPage] Parsed redirect URI from saved state:", redirectTo);
            } catch (e) {
                console.warn("[AuthPage] Could not parse saved state data:", e);
            }

            // Если есть redirect_uri в URL параметрах или в сохраненном state, используем его
            const finalRedirectUri = redirectUri || redirectTo;

            if (finalRedirectUri) {
                handleRedirect(finalRedirectUri, access_token);
            } else {
                console.log("[AuthPage] No redirect URI found, staying on auth page");
            }
        } catch (error) {
            console.error("[AuthPage] OAuth callback error:", error);
            toast.error(error.response?.data?.message || "Ошибка при авторизации через OAuth");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsFormLoading(true);
        console.log("[AuthPage] Form submitted, isLogin:", isLogin);

        try {
            const { data } = isLogin
                ? await loginUser(email, password, realm)
                : await registerUser(email, password);

            console.log("[AuthPage] Authentication successful:", data);
            const access_token = handleTokens(data);
            toast.success(isLogin ? "Вход выполнен успешно!" : "Регистрация успешна!");

            if (redirectUri) {
                handleRedirect(redirectUri, access_token);
            }
        } catch (error) {
            console.error("[AuthPage] Form submission error:", error);
            if (error.response?.status === 401) {
                toast.error("Неверный email или пароль");
            } else if (error.response?.status === 409) {
                toast.error("Пользователь с таким email уже существует");
            } else {
                toast.error(error.response?.data?.message || "Ошибка при аутентификации");
            }
        } finally {
            setIsFormLoading(false);
        }
    };

    const handleOAuthRedirect = async (provider) => {
        if (!isChecked && !isLogin) {
            toast.error("Пожалуйста, согласитесь с обработкой персональных данных");
            return;
        }

        const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
        setLoading(true);
        console.log("[AuthPage] Initiating OAuth redirect for provider:", provider);

        try {
            const sessionId = Date.now().toString();
            const stateData = {
                sessionId,
                action: isLogin ? "login" : "register",
                provider,
                timestamp: Date.now(),
                redirect_uri: redirectUri // Сохраняем redirect_uri в state
            };

            const state = JSON.stringify(stateData);
            console.log("[AuthPage] Generated OAuth state:", stateData);

            const { data: oauthUrl } = await getOAuthUrl(provider, state, redirectUri);

            if (typeof oauthUrl === "string") {
                const parsedUrl = new URL(oauthUrl);
                const serverState = parsedUrl.searchParams.get('state');
                console.log("[AuthPage] Received OAuth URL:", oauthUrl);

                // Сохраняем данные для последующей проверки
                localStorage.setItem(`${provider}_session_id`, sessionId);
                localStorage.setItem(`${provider}_action`, isLogin ? "login" : "register");
                localStorage.setItem(`${provider}_state`, serverState);
                localStorage.setItem(`${provider}_state_data`, state);

                console.log("[AuthPage] Saved OAuth state to localStorage");
                window.location.replace(oauthUrl);
            } else {
                throw new Error("Неверный формат URL для OAuth");
            }
        } catch (error) {
            console.error("[AuthPage] OAuth redirect error:", error);
            toast.error(error.response?.data?.message || "Ошибка при инициализации OAuth");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <Toaster position="top-right" />
            <div className="login">
                <div className="inner-container">
                    <h1>{isLogin ? "Вход" : "Регистрация"}</h1>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <div className="input-with-icon">
                                <EnvelopeIcon className="input-icon" />
                                <div className="input-wrapper">
                                    <input
                                        required
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <label htmlFor="email" className={email ? "filled" : ""}>
                                        Введите ваш email
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="input-group">
                            <div className="input-with-icon">
                                <LockClosedIcon className="input-icon" />
                                <div className="input-wrapper">
                                    <input
                                        required
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <label htmlFor="password" className={password ? "filled" : ""}>
                                        Введите пароль
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="password-toggle"
                                >
                                    {showPassword ? (
                                        <EyeSlashIcon className="input-icon" />
                                    ) : (
                                        <EyeIcon className="input-icon" />
                                    )}
                                </button>
                            </div>
                        </div>
                        {isLogin ? (
                            <div className="checkbox-group">
                                <input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={() => setRememberMe(!rememberMe)}
                                />
                                <span>Запомнить меня</span>
                                <a href="#" className="forgot-password">
                                    Забыли пароль?
                                </a>
                            </div>
                        ) : (
                            <div className="checkbox-group">
                                <input
                                    required
                                    id="agree"
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => setIsChecked(!isChecked)}
                                />
                                <label htmlFor="agree">
                                    Я соглашаюсь с{" "}
                                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
                                        обработкой персональных данных
                                    </a>
                                </label>
                            </div>
                        )}
                        <button
                            type="submit"
                            className={isFormLoading || (!isLogin && !isChecked) ? "disabled" : ""}
                            disabled={isFormLoading || (!isLogin && !isChecked)}
                        >
                            {isFormLoading ? (
                                <div className="spinner"></div>
                            ) : isLogin ? (
                                "Войти"
                            ) : (
                                "Зарегистрироваться"
                            )}
                        </button>
                    </form>
                    <div className="connect-with">
                        <hr />
                        <p>Или войдите через</p>
                        <hr />
                        <ul>
                            <li>
                                <button
                                    onClick={() => handleOAuthRedirect("vk")}
                                    className={isVkLoading || (!isLogin && !isChecked) ? "disabled" : ""}
                                    disabled={isVkLoading || (!isLogin && !isChecked)}
                                >
                                    {isVkLoading ? <div className="spinner"></div> : <FaVk className="social-icon" />}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => handleOAuthRedirect("yandex")}
                                    className={isYandexLoading || (!isLogin && !isChecked) ? "disabled" : ""}
                                    disabled={isYandexLoading || (!isLogin && !isChecked)}
                                >
                                    {isYandexLoading ? <div className="spinner"></div> : <img src={yandexLogo} alt="Yandex" className="social-icon" />}
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div className="clearfix"></div>
                    <span className="copyright">Политика конфиденциальности</span>
                </div>
            </div>
            <div className="register">
                <div className="inner-container">
                    <UserIcon className="register-icon" />
                    <h2>Привет, друг!</h2>
                    <p>
                        {isLogin
                            ? "Еще не зарегистрированы? Создайте аккаунт!"
                            : "Уже есть аккаунт? Войдите!"}
                    </p>
                    <button onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? "Зарегистрироваться" : "Войти"} <GlobeAltIcon className="arrow-icon" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;