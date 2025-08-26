import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useUser } from "./UserContext";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { provider } = useParams();
  const navigate = useNavigate();
  const { login } = useUser();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const sessionId = searchParams.get("cid") || searchParams.get("session_id");

    if (!code || !provider) {
      toast.error("Ошибка OAuth: нет кода или провайдера");
      navigate("/auth", { replace: true });
      return;
    }

    const savedState = localStorage.getItem(`${provider}_state`);
    if (state !== savedState) {
      toast.error("Ошибка OAuth: неверный state");
      navigate("/auth", { replace: true });
      return;
    }

    const action = localStorage.getItem(`${provider}_action`) || "login";
    const endpoint = action === "login"
      ? `/api/v1/default/${provider}/authentication`
      : `/api/v1/default/${provider}/registration`;

    fetch(`${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, state, session_id: sessionId }),
    })
      .then(res => res.json())
      .then(data => {
        const { access_token, refresh_token } = data;
        if (!access_token || !refresh_token) throw new Error("Некорректные токены");
        login(access_token, refresh_token, [], "default");
        toast.success(`Вход через ${provider === "vk" ? "ВКонтакте" : "Яндекс"} успешен`);
        localStorage.removeItem(`${provider}_state`);
        localStorage.removeItem(`${provider}_session_id`);
        localStorage.removeItem(`${provider}_action`);
        navigate("/", { replace: true });
      })
      .catch(err => {
        console.error("OAuth callback ошибка:", err);
        toast.error("Ошибка авторизации");
        navigate("/auth", { replace: true });
      });
  }, [provider, searchParams, navigate, login]);

  return (
    <div className="container">
      <div className="login">
        <div className="inner-container">
          <h1>Обработка авторизации через {provider}</h1>
          <div className="spinner-large"></div>
          <p>Пожалуйста, подождите</p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
