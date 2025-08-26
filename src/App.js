import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import AuthPage from "./AuthPage";
import HomePage from "./HomePage";
import "./common.css";

function ProtectedRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem("access_token");
  const [searchParams] = useSearchParams();
  const navigateTo = searchParams.size > 0 ? `/auth?${searchParams.toString()}` : "/auth";
  return isAuthenticated ? children : <Navigate to={navigateTo} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={
            <div className="auth-page">
              <AuthPage />
            </div>
          }
        />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;