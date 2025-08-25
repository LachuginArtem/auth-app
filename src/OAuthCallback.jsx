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
    const cid = searchParams.get("cid"); // Для Яндекса

    console.log("[OAuthCallback] Параметры URL:", {
      code,
      state,
      cid,
      provider,
      searchParams: Object.fromEntries(searchParams),
    });

    if (!code) {
      console.error("[OAuthCallback] Отсутствует параметр code");
      toast.error("Не найден код авторизации");
      navigate("/auth", { replace: true });
      return;
    }

    if (!provider || !["vk", "yandex"].includes(provider)) {
      console.error("[OAuthCallback] Некорректный провайдер:", provider);
      toast.error("Провайдер не указан или некорректен");
      navigate("/auth", { replace: true });
      return;
    }

    console.log("[OAuthCallback] Формирование запроса для провайдера:", provider, "isLogin:", isLogin);
    const endpoint = isLogin
      ? `/api/v1/${realm}/${provider}/authentication`
      : `/api/v1/${realm}/${provider}/registration`;

    const requestBody = {
      code,
      state,
      ...(provider === "yandex" && cid && { session_id: cid }),
    };

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
          let errorText = await res.text();
          console.error("[OAuthCallback] Ошибка сервера:", errorText, "Статус:", res.status);
          try {
            const errorData = JSON.parse(errorText);
            toast.error(errorData.message || `Ошибка авторизации через ${provider} (статус: ${res.status})`);
          } catch {
            toast.error(`Ошибка сервера: ${res.status} ${res.statusText}`);
          }
          throw new Error(errorText);
        }
        return res.json();
      })
      .then((data) => {
        console.log("[OAuthCallback] Успешный ответ сервера:", data);
        const { access_token, refresh_token, expires_at, session_id } = data;
        if (typeof access_token !== "string" || typeof refresh_token !== "string") {
          console.error("[OAuthCallback] Некорректные токены:", { access_token, refresh_token });
          toast.error("Некорректные токены");
          navigate("/auth", { replace: true });
          return;
        }
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("expires_at", expires_at || "");
        localStorage.setItem("session_id", session_id || "");
        console.log("[OAuthCallback] Токены сохранены в localStorage:", {
          access_token,
          refresh_token,
          session_id,
          expires_at,
        });
        toast.success(`Вход через ${provider === "vk" ? "ВКонтакте" : "Яндекс"} успешен`);
        navigate("/", { replace: true });
        console.log("[OAuthCallback] Перенаправление на главную страницу выполнено");
      })
      .catch((err) => {
        console.error("[OAuthCallback] Ошибка OAuth:", err.message, err.stack);
        toast.error(`Ошибка авторизации через ${provider}`);
        navigate("/auth", { replace: true });
      });
  }, [provider, searchParams, navigate, isLogin, realm]);

  console.log("[OAuthCallback] Рендеринг, провайдер:", provider);
  return (
    <div className="container">
      <div className="login">
        <div className="inner-container">
          <h1>Обработка авторизации через {provider === "vk" ? "ВКонтакте" : "Яндекс"}...</h1>
          <div className="spinner-large"></div>
          <p>Пожалуйста, подождите</p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;