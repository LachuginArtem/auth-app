import { createContext, useContext, useState } from "react";
import toast from "react-hot-toast";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState({ access: null, refresh: null });
  const [scopes, setScopes] = useState([]);
  const [realm, setRealm] = useState(null);

  const login = async (access, refresh, scopes = [], realm) => {
    try {
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("scopes", JSON.stringify(scopes));
      localStorage.setItem("realm", realm);

      console.log("[UserContext] Запрос на introspect токена, realm:", realm, "access_token:", access.substring(0, 10) + "...");

      // Проверяем токен через introspect
      const introspectResponse = await fetch(
        `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${realm}/auth/introspect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ token: access }),
        }
      );

      console.log("[UserContext] Ответ introspect, статус:", introspectResponse.status);
      if (!introspectResponse.ok) {
        const errorData = await introspectResponse.json();
        console.error("[UserContext] Ошибка introspect:", errorData);
        throw new Error("Не удалось проверить токен");
      }

      const userData = await introspectResponse.json();
      console.log("[UserContext] Данные из introspect:", userData);
      if (!userData.active) {
        console.error("[UserContext] Токен неактивен, причина:", userData.cause);
        throw new Error(userData.cause || "Токен недействителен");
      }

      setUser({
        email: userData.email,
        status: userData.status,
        roles: userData.roles,
      });
      setTokens({ access, refresh });
      setScopes(scopes);
      setRealm(realm);
      console.log("[UserContext] Пользователь успешно залогинен:", { email: userData.email, status: userData.status, roles: userData.roles });
      return true;
    } catch (error) {
      console.error("[UserContext] Ошибка входа:", error.message, error.stack);
      toast.error("Ошибка авторизации");
      return false;
    }
  };

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      const currentRealm = localStorage.getItem("realm");
      if (!refresh || !currentRealm) {
        throw new Error("Нет refresh токена или realm");
      }

      console.log("[UserContext] Запрос на refresh токена, realm:", currentRealm, "refresh_token:", refresh.substring(0, 10) + "...");

      const response = await fetch(
        `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${currentRealm}/auth/refresh`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        }
      );

      console.log("[UserContext] Ответ refresh, статус:", response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[UserContext] Ошибка refresh:", errorData);
        throw new Error("Ошибка обновления токена");
      }

      const data = await response.json();
      const { access_token, refresh_token, scopes } = data;
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("scopes", JSON.stringify(scopes));
      setTokens({ access: access_token, refresh: refresh_token });
      setScopes(scopes);
      console.log("[UserContext] Токены успешно обновлены");
      return true;
    } catch (error) {
      console.error("[UserContext] Ошибка обновления токена:", error.message, error.stack);
      toast.error("Сессия истекла. Пожалуйста, войдите снова.");
      logout();
      return false;
    }
  };

  const logout = async () => {
    try {
      const access = localStorage.getItem("access_token");
      const currentRealm = localStorage.getItem("realm");
      if (access && currentRealm) {
        console.log("[UserContext] Запрос на logout, realm:", currentRealm, "access_token:", access.substring(0, 10) + "...");
        const response = await fetch(
          `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${currentRealm}/auth/logout`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access}`,
            },
          }
        );
        console.log("[UserContext] Ответ logout, статус:", response.status);
      }
    } catch (error) {
      console.error("[UserContext] Ошибка выхода:", error.message, error.stack);
    } finally {
      setUser(null);
      setTokens({ access: null, refresh: null });
      setScopes([]);
      setRealm(null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("scopes");
      localStorage.removeItem("realm");
      console.log("[UserContext] Пользователь успешно разлогинен, localStorage очищен");
    }
  };

  return (
    <UserContext.Provider value={{ user, tokens, scopes, realm, login, logout, refreshToken }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);