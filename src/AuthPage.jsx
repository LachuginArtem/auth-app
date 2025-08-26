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
  const handledRef = useRef(false);

  const realm = "default";
  const API_BASE = process.env.REACT_APP_DOMAIN_REGISTRATION || "";

  // Проверка локальной авторизации
  useEffect(() => {
    const isAuthenticated = !!localStorage.getItem("access_token");
    if (isAuthenticated) navigate("/", { replace: true });
  }, [navigate]);

  // Ловим ?code и обрабатываем только один раз
  useEffect(() => {
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");

    if (code && !handledRef.current) {
      handledRef.current = true;
      handleOAuthCallback(code, stateParam);
    }
  }, [searchParams]);

  // Обработка OAuth callback
  const handleOAuthCallback = async (code, stateParam) => {
    try {
      const savedStateRaw = localStorage.getItem("oauth_state");
      if (!savedStateRaw) {
        toast.error("Не найден сохранённый state.");
        navigate("/auth", { replace: true });
        return;
      }

      let saved;
      try {
        saved = JSON.parse(savedStateRaw);
      } catch {
        toast.error("Повреждён сохранённый state.");
        navigate("/auth", { replace: true });
        return;
      }

      const { provider, action, stateId } = saved || {};
      if (!provider || !action || !stateId) {
        toast.error("Неполный сохранённый state.");
        navigate("/auth", { replace: true });
        return;
      }

      if (stateParam !== stateId) {
        toast.error("Ошибка: Неверный state параметр.");
        navigate("/auth", { replace: true });
        return;
      }

      const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
      setLoading(true);

      const tokenEndpoint = `/api/v1/${realm}/${provider}/${action === "login" ? "authentication" : "registration"}`;
      const res = await fetch(`${API_BASE}${tokenEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // согласно твоему Swagger, для Яндекса нужны только { code, state }
        body: JSON.stringify({ code, state: stateParam }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        toast.error(`Ошибка OAuth (${provider}): ${text || res.status}`);
        navigate("/auth", { replace: true });
        return;
      }

      const data = await res.json();
      const { access_token, refresh_token, expires_at, session_id } = data || {};
      if (!access_token || !refresh_token) {
        toast.error("Некорректные токены от сервера.");
        navigate("/auth", { replace: true });
        return;
      }

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_at", String(expires_at ?? ""));
      localStorage.setItem("session_id", String(session_id ?? ""));

      toast.success(`Вход через ${provider === "vk" ? "ВКонтакте" : "Яндекс"} успешен!`);

      // очистка временных данных и URL
      localStorage.removeItem("oauth_state");
      window.history.replaceState({}, document.title, "/auth");

      navigate("/", { replace: true });
    } catch (e) {
      console.error("[AuthPage] Ошибка в OAuth callback:", e);
      toast.error("Ошибка сети или сервера.");
      navigate("/auth", { replace: true });
    } finally {
      setIsVkLoading(false);
      setIsYandexLoading(false);
    }
  };

  // Сабмит формы (email + пароль)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);

    const body = { email, password };
    const endpoint = isLogin ? `/api/v1/${realm}/auth/login` : `/api/v1/registration`;

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        let msg = "Ошибка входа/регистрации.";
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {}
        toast.error(msg);
        return;
      }

      const data = await res.json();
      const { access_token, refresh_token, expires_at, session_id } = data || {};
      if (!access_token || !refresh_token) {
        toast.error("Некорректные токены.");
        return;
      }

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_at", String(expires_at ?? ""));
      localStorage.setItem("session_id", String(session_id ?? ""));

      toast.success(isLogin ? "Вход успешен!" : "Регистрация успешна!");
      navigate("/", { replace: true });
    } catch {
      toast.error("Ошибка сети. Попробуйте позже.");
    } finally {
      setIsFormLoading(false);
    }
  };

  // Редирект на OAuth провайдера
  const handleOAuthRedirect = async (provider) => {
    if (!isLogin && !isChecked) {
      toast.error("Пожалуйста, согласитесь с обработкой персональных данных.");
      return;
    }

    const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
    setLoading(true);

    try {
      // сохраняем намерение (provider + action), но stateId возьмём из ответа сервера (из URL)
      const draft = {
        provider,
        action: isLogin ? "login" : "registration",
        stateId: null, // заполним после ответа
      };

      const redirectUri = `https://auth-app-v0pz.onrender.com/auth`;
      const linkUrl = `${API_BASE}/api/v1/${provider}/link?state=${encodeURIComponent(
        String(Date.now())
      )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      const res = await fetch(linkUrl, { method: "GET", credentials: "include" });
      if (!res.ok) {
        let msg = "Ошибка OAuth.";
        try {
          const err = await res.json();
          msg = err?.message || msg;
        } catch {}
        toast.error(msg);
        return;
      }

      const data = await res.json();
      if (typeof data !== "string") {
        toast.error("Неверный формат ответа от сервера (ожидалась строка URL).");
        return;
      }

      // ВАЖНО: сервер сгенерировал свой state — вытащим его из ссылки
      let serverState = null;
      try {
        const u = new URL(data);
        serverState = u.searchParams.get("state");
      } catch {
        // если по какой-то причине не смогли распарсить URL
      }

      // сохраняем именно serverState, чтобы затем сравнить его на колбэке
      localStorage.setItem(
        "oauth_state",
        JSON.stringify({ ...draft, stateId: serverState })
      );

      // уходим на страницу авторизации провайдера
      window.location.href = data;
    } catch (e) {
      console.error("[AuthPage] Ошибка при OAuth редиректе:", e);
      toast.error("Ошибка сети или сервера.");
    } finally {
      setLoading(false);
    }
  };

  // UI (оставил твою разметку)
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
                  {showPassword ? <EyeSlashIcon className="input-icon" /> : <EyeIcon className="input-icon" />}
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
                  {isYandexLoading ? <div className="spinner"></div> : (
                    <img src={yandexLogo} alt="Yandex" className="social-icon" />
                  )}
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
