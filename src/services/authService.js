import { toast } from "react-hot-toast";

export const handleTokens = (data) => {
  const { access_token, refresh_token, expires_at, session_id } = data;
  
  if (typeof access_token !== "string" || typeof refresh_token !== "string") {
    console.error("[AuthService] Invalid tokens:", { access_token, refresh_token });
    throw new Error("Invalid tokens");
  }

  localStorage.setItem("access_token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
  localStorage.setItem("expires_at", expires_at || "");
  localStorage.setItem("session_id", session_id || "");
  
  console.log("[AuthService] Tokens saved to localStorage");
};

export const clearOAuthState = (provider) => {
  localStorage.removeItem(`${provider}_session_id`);
  localStorage.removeItem(`${provider}_action`);
  localStorage.removeItem(`${provider}_state`);
  localStorage.removeItem(`${provider}_state_data`);
  console.log("[AuthService] Cleared OAuth state from localStorage");
};

export const handleAuthSuccess = (data, isLogin = true) => {
  if (isLogin) {
    handleTokens(data);
    toast.success("Login successful!");
  } else {
    console.log("[AuthService] Registration successful:", data);
    toast.success("Registration successful!");
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem("access_token");
};