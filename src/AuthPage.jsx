import React, { useState, useEffect } from "react";
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
  const realm = "default";

  // 🔹 Проверка локальной авторизации
  useEffect(() => {
    console.log("[AuthPage] Компонент смонтирован, URL:", window.location.href);
    const isAuthenticated = !!localStorage.getItem("access_token");
    console.log("[AuthPage] Проверка авторизации, isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      console.log("[AuthPage] Пользователь уже авторизован, перенаправляем на /");
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // 🔹 Обработка OAuth callback (Яндекс / VK)
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const cid = searchParams.get("cid");

    if (code) {
      console.log("[AuthPage] Найден code в URL, вызываем handleOAuthCallback");
      handleOAuthCallback(code, state, cid);
    }
  }, [searchParams]);

  // 🔹 Функция обработки OAuth callback
  const handleOAuthCallback = async (code, stateParam, cid) => {
    console.log("[AuthPage] Начало обработки OAuth callback:", {
      code,
      state: stateParam,
      cid,
      fullUrl: window.location.href,
    });

    let provider = cid ? "yandex" : "vk";
    let sessionId = localStorage.getItem(`${provider}_session_id`) || Date.now().toString();
    let action = localStorage.getItem(`${provider}_action`) || "login";
    let savedState = localStorage.getItem(`${provider}_state`);

    // Проверка совпадения state
    let stateObj = {};
    try {
      stateObj = JSON.parse(savedState);
      if (stateParam !== savedState && stateParam !== stateObj.stateId) {
        toast.error("Ошибка: Неверный state параметр.");
        navigate("/auth", { replace: true });
        return;
      }
    } catch {
      if (stateParam !== savedState) {
        toast.error("Ошибка: Неверный state параметр.");
        navigate("/auth", { replace: true });
        return;
      }
    }

    provider = stateObj.provider || provider;
    sessionId = stateObj.sessionId || sessionId;
    action = stateObj.action || action;

    const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
    setLoading(true);

    try {
      const tokenEndpoint = `/api/v1/${realm}/${provider}/${action === "login" ? "authentication" : "registration"}`;
      const requestBody = {
        code,
        state: stateParam,
        ...(provider === "yandex" && cid && { session_id: cid }),
      };

      const response = await fetch(
        `${process.env.REACT_APP_DOMAIN_REGISTRATION}${tokenEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Ошибка OAuth (${provider}): ${errorText}`);
        navigate("/auth", { replace: true });
        return;
      }

      const data = await response.json();
      const { access_token, refresh_token, expires_at, session_id } = data;

      if (!access_token || !refresh_token) {
        toast.error("Некорректные токены от сервера.");
        navigate("/auth", { replace: true });
        return;
      }

      // Сохраняем токены
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_at", expires_at || "");
      localStorage.setItem("session_id", session_id || "");

      toast.success(`Вход через ${provider === "vk" ? "ВКонтакте" : "Яндекс"} успешен!`);

      // Чистим временные данные
      localStorage.removeItem(`${provider}_session_id`);
      localStorage.removeItem(`${provider}_action`);
      localStorage.removeItem(`${provider}_state`);

      // Чистим URL от code/state
      window.history.replaceState({}, document.title, "/auth");

      // Редиректим на главную
      navigate("/", { replace: true });
    } catch (error) {
      console.error("[AuthPage] Ошибка в OAuth callback:", error.message);
      toast.error(`Ошибка сети для ${provider}. Проверьте бэкенд.`);
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Сабмит формы (email + пароль)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);

    const body = { email, password };
    const endpoint = isLogin
      ? `/api/v1/${realm}/auth/login`
      : `/api/v1/registration`;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Ошибка входа.");
        return;
      }

      const data = await response.json();
      const { access_token, refresh_token, expires_at, session_id } = data;

      if (!access_token || !refresh_token) {
        toast.error("Некорректные токены.");
        return;
      }

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_at", expires_at || "");
      localStorage.setItem("session_id", session_id || "");

      toast.success(isLogin ? "Вход успешен!" : "Регистрация успешна!");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Ошибка сети. Попробуйте позже.");
    } finally {
      setIsFormLoading(false);
    }
  };

  // 🔹 Редирект на Яндекс / VK
  const handleOAuthRedirect = async (provider) => {
    if (!isChecked && !isLogin) {
      toast.error("Пожалуйста, согласитесь с обработкой персональных данных.");
      return;
    }
    const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
    setLoading(true);

    try {
      const sessionId = Date.now().toString();
      const stateData = {
        sessionId,
        action: isLogin ? "login" : "register",
        provider,
        timestamp: Date.now(),
      };
      const state = JSON.stringify(stateData);

      const redirectUri = `https://auth-app-v0pz.onrender.com/auth`;
      const url = `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${provider}/link?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      const response = await fetch(url, { method: "GET", credentials: "include" });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Ошибка OAuth.");
        return;
      }

      const data = await response.json();
      if (typeof data === "string") {
        localStorage.setItem(`${provider}_session_id`, sessionId);
        localStorage.setItem(`${provider}_action`, isLogin ? "login" : "register");
        localStorage.setItem(`${provider}_state`, state);
        window.location.href = data;
      } else {
        toast.error("Неверный формат ответа от сервера.");
      }
    } catch (error) {
      toast.error("Ошибка сети или сервера.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 UI
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
                <a href="#" className="forgot-password">Забыли пароль?</a>
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
              {isFormLoading ? <div className="spinner"></div> : isLogin ? "Войти" : "Зарегистрироваться"}
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
          <p>{isLogin ? "Еще не зарегистрированы? Создайте аккаунт!" : "Уже есть аккаунт? Войдите!"}</p>
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Зарегистрироваться" : "Войти"} <GlobeAltIcon className="arrow-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
