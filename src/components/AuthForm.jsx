import React from "react";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const AuthForm = ({
  isLogin,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isFormLoading,
  rememberMe,
  setRememberMe,
  isChecked,
  setIsChecked,
  handleSubmit,
}) => {
  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <div className="input-with-icon">
          <EnvelopeIcon className="input-icon" />
          <div className="input-wrapper">
            <input
              required
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="email" className={email ? "filled" : ""}>
              Введите ваш email
            </label>
          </div>
        </div>
      </div>
      {/* Password input */}
      <div className="input-group">
        <div className="input-with-icon">
          <LockClosedIcon className="input-icon" />
          <div className="input-wrapper">
            <input
              required
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password" className={password ? "filled" : ""}>
              Введите пароль
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="password-toggle"
          >
            {showPassword ? (
              <EyeSlashIcon className="input-icon" />
            ) : (
              <EyeIcon className="input-icon" />
            )}
          </button>
        </div>
      </div>
      {/* Checkboxes */}
      {isLogin ? (
        <div className="checkbox-group">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
          />
          <span>Запомнить меня</span>
          <a href="#" className="forgot-password">
            Забыли пароль?
          </a>
        </div>
      ) : (
        <div className="checkbox-group">
          <input
            required
            id="agree"
            type="checkbox"
            checked={isChecked}
            onChange={() => setIsChecked(!isChecked)}
          />
          <label htmlFor="agree">
            Я соглашаюсь с{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">
              обработкой персональных данных
            </a>
          </label>
        </div>
      )}
      {/* Submit button */}
      <button
        type="submit"
        className={isFormLoading || (!isLogin && !isChecked) ? "disabled" : ""}
        disabled={isFormLoading || (!isLogin && !isChecked)}
      >
        {isFormLoading ? (
          <div className="spinner"></div>
        ) : isLogin ? (
          "Войти"
        ) : (
          "Зарегистрироваться"
        )}
      </button>
    </form>
  );
};

export default AuthForm;