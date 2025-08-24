import { useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const OAuthCallback = ({ isLogin = true, realm = "default" }) => {
  const [searchParams] = useSearchParams();
  const { provider } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      toast.error("Не найден code");
      navigate("/auth");
      return;
    }

    // Формируем правильный эндпоинт
    const endpoint = isLogin
      ? `/api/v1/${realm}/${provider}/authentication`
      : `/api/v1/${realm}/${provider}/registration`;

    fetch(`${process.env.REACT_APP_DOMAIN_REGISTRATION}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("session_id", data.session_id || "");
        localStorage.setItem("expires_at", data.expires_at || "");
        toast.success(`Вход через ${provider} успешен`);
        navigate("/");
      })
      .catch((err) => {
        console.error("OAuth error:", err);
        toast.error("Ошибка авторизации");
        navigate("/auth");
      });
  }, [provider, searchParams, navigate, isLogin, realm]);

  return <h2>Авторизация через {provider}...</h2>;
};

export default OAuthCallback;
