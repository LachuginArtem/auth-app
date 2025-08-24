import React, { createContext, useContext } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const login = async (access, refresh) => {
    // Заглушка: реализуйте логику хранения токенов
    console.log("Авторизация с токенами:", { access, refresh });
    return true; // Имитация успешной авторизации
  };

  return (
    <UserContext.Provider value={{ login }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);