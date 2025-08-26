import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { FaVk } from "react-icons/fa";
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, UserIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import yandexLogo from "./assets/yandex-logo.png";
import { useUser } from "./UserContext";
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
  const { login } = useUser();
  const realm = "default";

  // Если есть OAuth callback — обрабатываем его
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const cid = searchParams.get("cid");
    const provider = searchParams.get("provider"); // передавайте provider в query, например ?provider=yandex

    if (code && state && provider) {
      const savedState = localStorage.getItem(`${provider}_state`);
      if (state !== savedState) {
        toast.error("Ошибка OAuth: неверный state");
        navigate("/auth", { replace: true });
        return;
      }

      const action = localStorage.getItem(`${provider}_action`) || "login";
      const endpoint = action === "login"
        ? `/api/v1/${realm}/${provider}/authentication`
        : `/api/v1/${realm}/${provider}/registration`;

      fetch(`${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, state, session_id: cid }),
      })
        .then(res => res.json())
        .then(data => {
          const { access_token, refresh_token } = data;
          if (!access_token || !refresh_token) throw new Error("Некорректные токены");
          login(access_token, refresh_token, [], realm);
          toast.success(`Вход через ${provider} успешен`);
          localStorage.removeItem(`${provider}_state`);
          localStorage.removeItem(`${provider}_session_id`);
          localStorage.removeItem(`${provider}_action`);
          navigate("/", { replace: true });
        })
        .catch(err => {
          console.error("OAuth ошибка:", err);
          toast.error("Ошибка авторизации");
          navigate("/auth", { replace: true });
        });
    }
  }, [searchParams, navigate, login, realm]);

  useEffect(() => {
    // Если пользователь уже авторизован — редирект на /
    if (localStorage.getItem("access_token")) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleOAuthRedirect = async (provider) => {
    if (!isChecked && !isLogin) {
      toast.error("Пожалуйста, согласитесь с обработкой персональных данных.");
      return;
    }

    const setLoading = provider === "vk" ? setIsVkLoading : setIsYandexLoading;
    setLoading(true);

    try {
      const state = Date.now().toString();
      const sessionId = Date.now().toString();

      localStorage.setItem(`${provider}_state`, state);
      localStorage.setItem(`${provider}_session_id`, sessionId);
      localStorage.setItem(`${provider}_action`, isLogin ? "login" : "register");

      const redirectUri = `${window.location.origin}/auth?provider=${provider}`;
      const url = `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${provider}/link?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;

      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || "Ошибка OAuth.");
        return;
      }

      const oauthUrl = await response.text();
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("OAuth редирект ошибка:", error);
      toast.error("Ошибка сети или сервера.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsFormLoading(true);

    const body = { email, password };
    const endpoint = isLogin ? `/api/v1/${realm}/auth/login` : `/api/v1/registration`;

    try {
      const response = await fetch(`${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Ошибка сервера" }));
        toast.error(errorData.message || "Ошибка сервера");
        return;
      }

      const data = await response.json();
      const { access_token, refresh_token, expires_at, session_id } = data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("expires_at", expires_at || "");
      localStorage.setItem("session_id", session_id || "");
      toast.success(isLogin ? "Вход выполнен!" : "Регистрация успешна!");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Ошибка сети или сервера.");
    } finally {
      setIsFormLoading(false);
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <label className={email ? "filled" : ""}>Введите ваш email</label>
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <label className={password ? "filled" : ""}>Введите пароль</label>
                </div>
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeSlashIcon className="input-icon" /> : <EyeIcon className="input-icon" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="checkbox-group">
                <input
                  required
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => setIsChecked(!isChecked)}
                />
                <label>Согласие с обработкой персональных данных</label>
              </div>
            )}

            <button type="submit" disabled={isFormLoading || (!isLogin && !isChecked)}>
              {isFormLoading ? <div className="spinner"></div> : isLogin ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>

          <div className="connect-with">
            <hr />
            <p>Или войдите через</p>
            <hr />
            <ul>
              <li>
                <button onClick={() => handleOAuthRedirect("vk")} disabled={isVkLoading}>
                  {isVkLoading ? <div className="spinner"></div> : <FaVk />}
                </button>
              </li>
              <li>
                <button onClick={() => handleOAuthRedirect("yandex")} disabled={isYandexLoading}>
                  {isYandexLoading ? <div className="spinner"></div> : <img src={yandexLogo} alt="Yandex" />}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
