import { useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const OAuthCallback = ({ isLogin = true, realm = "default" }) => {
  const [searchParams] = useSearchParams();
  const { provider } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[OAuthCallback] Компонент смонтирован, URL:", window.location.href);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    console.log("[OAuthCallback] Параметры URL:", {
      code,
      state,
      provider,
      searchParams: Object.fromEntries(searchParams),
    });

    if (!code) {
      console.error("[OAuthCallback] Отсутствует параметр code");
      toast.error("Не найден code");
      navigate("/auth");
      return;
    }

    if (!provider) {
      console.error("[OAuthCallback] Провайдер не указан в URL");
      toast.error("Провайдер не указан");
      navigate("/auth");
      return;
    }

    console.log("[OAuthCallback] Формирование запроса для провайдера:", provider, "isLogin:", isLogin);
    const endpoint = isLogin
      ? `/api/v1/${realm}/${provider}/authentication`
      : `/api/v1/${realm}/${provider}/registration`;

    const requestBody = { code, state };
    console.log("[OAuthCallback] Запрос на:", `${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, "Тело:", requestBody);

    fetch(`${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(requestBody),
    })
      .then(async (res) => {
        console.log("[OAuthCallback] Ответ сервера, статус:", res.status);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("[OAuthCallback] Ошибка сервера:", errorText, "Статус:", res.status);
          throw new Error(errorText);
        }
        return res.json();
      })
      .then((data) => {
        console.log("[OAuthCallback] Успешный ответ сервера:", data);
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("session_id", data.session_id || "");
        localStorage.setItem("expires_at", data.expires_at || "");
        console.log("[OAuthCallback] Токены сохранены в localStorage:", {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          session_id: data.session_id,
          expires_at: data.expires_at,
        });
        toast.success(`Вход через ${provider} успешен`);
        navigate("/");
      })
      .catch((err) => {
        console.error("[OAuthCallback] Ошибка OAuth:", err.message, err.stack);
        toast.error(`Ошибка авторизации через ${provider}`);
        navigate("/auth");
      });
  }, [provider, searchParams, navigate, isLogin, realm]);

  console.log("[OAuthCallback] Рендеринг, провайдер:", provider);
  return <h2>Авторизация через {provider}...</h2>;
};

export default OAuthCallback;