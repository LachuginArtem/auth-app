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

  useEffect(() => {
    console.log("[AuthPage] Компонент смонтирован, URL:", window.location.href);
    const isAuthenticated = !!localStorage.getItem("access_token");
    console.log("[AuthPage] Проверка авторизации, isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      console.log("[AuthPage] Пользователь уже авторизован, перенаправляем на /");
      navigate("/", { replace: true });
    }
  }, [navigate]);

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

    // Проверяем, совпадает ли state с сохранённым
    let stateObj = {};
    try {
      stateObj = JSON.parse(savedState); // Парсим сохранённый state из localStorage
      console.log("[AuthPage] Успешный парсинг savedState:", stateObj);
      if (stateParam !== stateObj.stateId && stateParam !== savedState) {
        console.error("[AuthPage] State mismatch:", { received: stateParam, expected: savedState });
        toast.error("Ошибка: Неверный state параметр.");
        navigate("/auth", { replace: true });
        return;
      }
    } catch (error) {
      console.warn("[AuthPage] Ошибка парсинга сохранённого state:", error.message);
      // Если state не JSON, используем его как строку
      if (stateParam !== savedState) {
        console.error("[AuthPage] State mismatch:", { received: stateParam, expected: savedState });
        toast.error("Ошибка: Неверный state параметр.");
        navigate("/auth", { replace: true });
        return;
      }
    }

    provider = stateObj.provider || provider;
    sessionId = stateObj.sessionId || sessionId;
    action = stateObj.action || action;
    console.log("[AuthPage] Данные из state:", { provider, sessionId, action });

    const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
    setLoading(true);
    console.log("[AuthPage] Установлен loading для", provider, ":", true);

    try {
      const tokenEndpoint = `/api/v1/${realm}/${provider}/${action === "login" ? "authentication" : "registration"}`;
      const requestBody = {
        code,
        state: stateParam,
        ...(provider === "yandex" && cid && { session_id: cid }),
      };

      console.log("[AuthPage] Запрос на получение токена:", {
        url: `${process.env.REACT_APP_DOMAIN_REGISTRATION}${tokenEndpoint}`,
        body: requestBody,
      });

      const response = await fetch(
        `${process.env.REACT_APP_DOMAIN_REGISTRATION}${tokenEndpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
          credentials: "include",
        }
      );

      console.log("[AuthPage] Ответ на запрос токена, статус:", response.status);
      if (!response.ok) {
        let errorText = await response.text();
        console.error("[AuthPage] Ошибка сервера при получении токена:", errorText, "Статус:", response.status);
        try {
          const errorData = JSON.parse(errorText);
          toast.error(errorData.message || `Ошибка OAuth для ${provider} (статус: ${response.status})`);
        } catch {
          toast.error(`Ошибка сервера: ${response.status} ${response.statusText}. Проверьте бэкенд.`);
        }
        navigate("/auth", { replace: true });
        return;
      }

      const data = await response.json();
      console.log("[AuthPage] Успешный ответ с токенами:", data);

      const { access_token, refresh_token, expires_at, session_id } = data;

      if (typeof access_token !== "string" || typeof refresh_token !== "string") {
        console.error("[AuthPage] Некорректные токены:", { access_token, refresh_token });
        toast.error("Некорректные токены.");
        navigate("/auth", { replace: true });
        return;
      }

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_at", expires_at || "");
      localStorage.setItem("session_id", session_id || "");

      console.log("[AuthPage] Токены сохранены в localStorage:", {
        access_token,
        refresh_token,
        expires_at,
        session_id,
      });

      toast.success(`Вход через ${provider === "vk" ? "ВКонтакте" : "Яндекс"} успешен!`);

      localStorage.removeItem(`${provider}_session_id`);
      localStorage.removeItem(`${provider}_action`);
      localStorage.removeItem(`${provider}_state`);
      console.log("[AuthPage] Очищены временные данные из localStorage");

      window.history.replaceState({}, document.title, "/auth");
      console.log("[AuthPage] История браузера очищена");

      try {
        navigate("/", { replace: true });
        console.log("[AuthPage] Перенаправление на главную страницу выполнено");
      } catch (error) {
        console.error("[AuthPage] Ошибка при перенаправлении:", error.message, error.stack);
        toast.error("Ошибка при перенаправлении на главную страницу.");
      }
    } catch (error) {
      console.error("[AuthPage] Ошибка в OAuth callback:", error.message, error.stack);
      toast.error(`Ошибка сети для ${provider}. Убедитесь, что бэкенд запущен.`);
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
      console.log("[AuthPage] Завершение обработки OAuth callback, loading для", provider, ":", false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);

    const body = { email, password };
    const endpoint = isLogin
      ? `/api/v1/${realm}/auth/login`
      : `/api/v1/registration`;

    try {
      console.log("[AuthPage] Запрос на:", `${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, "Тело:", body);
      const response = await fetch(
        `${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        }
      );

      console.log("[AuthPage] Ответ от сервера, статус:", response.status);
      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
          console.error("[AuthPage] Ошибка сервера, данные:", errorData, "Статус:", response.status);
        } catch (err) {
          console.error("[AuthPage] Не удалось разобрать ответ сервера:", err);
          errorData = { message: "Ответ сервера не в формате JSON" };
        }
        if (response.status === 401) {
          toast.error("Неверный email или пароль.");
        } else if (response.status === 409 && !isLogin) {
          toast.error("Пользователь с таким email уже зарегистрирован.");
        } else if (response.status === 422) {
          const details = errorData.detail?.map((err) => err.msg).join(", ") || "Ошибка валидации данных.";
          toast.error(`Ошибка валидации: ${details}`);
        } else if (response.status === 500) {
          toast.error("Внутренняя ошибка сервера. Пожалуйста, попробуйте позже или обратитесь в поддержку.");
        } else {
          toast.error(errorData.message || "Ошибка сервера. Попробуйте снова.");
        }
        return;
      }

      const data = await response.json();
      console.log("[AuthPage] Успешный ответ от сервера:", data);
      if (isLogin) {
        const { access_token, refresh_token, expires_at, session_id } = data;
        if (typeof access_token !== "string" || typeof refresh_token !== "string") {
          console.error("[AuthPage] Некорректные токены:", { access_token, refresh_token });
          toast.error("Некорректные токены.");
          return;
        }
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("expires_at", expires_at || "");
        localStorage.setItem("session_id", session_id || "");
        console.log("[AuthPage] Токены сохранены в localStorage:", { access_token, refresh_token, expires_at, session_id });
        toast.success("Вход выполнен успешно!");
        navigate("/", { replace: true });
      } else {
        const { id, email, status, created_at } = data;
        console.log("[AuthPage] Регистрация успешна, данные:", { id, email, status, created_at });
        toast.success("Регистрация успешна!");
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error("[AuthPage] Ошибка при отправке формы:", error.message, error.stack);
      toast.error(
        isLogin
          ? "Ошибка при вводе данных, проверьте данные."
          : "Ошибка при регистрации. Попробуйте снова."
      );
    } finally {
      setIsFormLoading(false);
      console.log("[AuthPage] Завершение обработки формы, isFormLoading:", false);
    }
  };

  const handleOAuthRedirect = async (provider) => {
    console.log("[AuthPage] Запуск OAuth редиректа для провайдера:", provider);
    if (!isChecked && !isLogin) {
      console.warn("[AuthPage] Чекбокс согласия не отмечен, редирект отменен");
      toast.error("Пожалуйста, согласитесь с обработкой персональных данных.");
      return;
    }
    const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
    setLoading(true);
    console.log("[AuthPage] Установлен loading для", provider, ":", true);

    try {
      const sessionId = Date.now().toString();
      const stateData = {
        sessionId,
        action: isLogin ? "login" : "register",
        provider,
        timestamp: Date.now(),
      };
      const state = JSON.stringify(stateData);
      console.log("[AuthPage] Сформирован state для OAuth:", state);

      const redirectUri = `https://auth-app-v0pz.onrender.com/oauth/${provider}/callback`;
      const url = `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${provider}/link?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      console.log("[AuthPage] Запрос OAuth URL:", url);
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
      });

      console.log("[AuthPage] Ответ на запрос OAuth URL, статус:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[AuthPage] Ошибка получения OAuth URL:", errorData, "Статус:", response.status);
        toast.error(errorData.message || "Ошибка OAuth.");
        return;
      }

      const data = await response.json();
      console.log("[AuthPage] Ответ сервера с OAuth URL:", data);
      if (typeof data === "string") {
        localStorage.setItem(`${provider}_session_id`, sessionId);
        localStorage.setItem(`${provider}_action`, isLogin ? "login" : "register");
        localStorage.setItem(`${provider}_state`, state);
        console.log("[AuthPage] Сохранены данные в localStorage:", {
          [`${provider}_session_id`]: sessionId,
          [`${provider}_action`]: isLogin ? "login" : "register",
          [`${provider}_state`]: state,
        });
        console.log("[AuthPage] Перенаправление на OAuth URL:", data);
        window.location.href = data;
      } else {
        console.error("[AuthPage] Неверный формат ответа OAuth URL:", data);
        toast.error("Ошибка: Неверный формат ответа от сервера.");
      }
    } catch (error) {
      console.error("[AuthPage] Ошибка при OAuth редиректе:", error.message, error.stack);
      toast.error("Ошибка сети или сервера.");
    } finally {
      setLoading(false);
      console.log("[AuthPage] Завершение OAuth редиректа, loading для", provider, ":", false);
    }
  };

  console.log("[AuthPage] Рендеринг формы, isLogin:", isLogin);
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