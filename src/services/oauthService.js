import { toast } from "react-hot-toast";

export const initiateOAuthFlow = async (provider, isLogin, redirectUri) => {
  const sessionId = Date.now().toString();
  const stateData = {
    sessionId,
    action: isLogin ? "login" : "register",
    provider,
    timestamp: Date.now(),
    redirect_uri: redirectUri
  };
  
  const state = JSON.stringify(stateData);
  console.log("[OAuthService] Generated OAuth state:", state);

  const defaultRedirectUri = `https://auth-app-v0pz.onrender.com/oauth/${provider}/callback`;
  const finalRedirectUri = redirectUri || defaultRedirectUri;

  const url = `${process.env.REACT_APP_DOMAIN_REGISTRATION}/api/v1/${provider}/link?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}`;
  
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "OAuth error");
  }

  const data = await response.json();
  
  if (typeof data !== "string") {
    throw new Error("Invalid server response format");
  }

  const oauthUrl = new URL(data);
  const serverState = oauthUrl.searchParams.get('state');

  // Save OAuth state
  localStorage.setItem(`${provider}_session_id`, sessionId);
  localStorage.setItem(`${provider}_action`, isLogin ? "login" : "register");
  localStorage.setItem(`${provider}_state`, serverState);
  localStorage.setItem(`${provider}_state_data`, state);

  return data;
};

export const handleOAuthCallback = async (code, stateParam, cid, realm = "default") => {
  let provider = cid ? "yandex" : "vk";
  
  const savedState = localStorage.getItem(`${provider}_state`);
  const savedStateData = localStorage.getItem(`${provider}_state_data`);

  if (stateParam !== savedState) {
    throw new Error("Invalid state parameter");
  }

  let stateObj = {};
  try {
    stateObj = JSON.parse(savedStateData);
  } catch (error) {
    console.warn("[OAuthService] Error parsing saved stateData:", error);
  }

  const tokenEndpoint = `/api/v1/${realm}/${provider}/${stateObj.action === "login" ? "authentication" : "registration"}`;
  
  const response = await fetch(
    `${process.env.REACT_APP_DOMAIN_REGISTRATION}${tokenEndpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        state: stateParam,
        ...(provider === "yandex" && cid && { session_id: cid }),
      }),
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(`OAuth error (status: ${response.status})`);
  }

  const data = await response.json();
  return { data, stateObj };
};