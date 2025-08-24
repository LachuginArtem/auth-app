import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import HomePage from "./HomePage";
import OAuthCallback from "./OAuthCallback"; // импортируем callback
import "./common.css";

function ProtectedRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem("access_token");
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* страница авторизации */}
        <Route
          path="/auth"
          element={
            <div className="auth-page">
              <AuthPage />
            </div>
          }
        />

        {/* домашняя страница */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div className="home-page">
                <HomePage />
              </div>
            </ProtectedRoute>
          }
        />

        {/* роут для OAuth callback */}
        <Route
          path="/oauth/:provider/callback"
          element={<OAuthCallback />}
        />

        {/* редирект на /auth для неизвестных роутов */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
