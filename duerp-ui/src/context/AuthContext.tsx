import { ReactNode, createContext, useContext, useState } from "react";
import { setLogoutFunction } from "../api";

type User = {
  id: string;
  username: string;
  emp_name: string;
  email: string;
  image_location: string;
  image: string;
};

type AuthContextType = {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: User | null;
  login: (accessToken: string,  user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("access_token")
  );
  const [user, setUser] = useState<User | null>(
    localStorage.getItem("user_data") ? JSON.parse(localStorage.getItem("user_data")!) : null
  );

  const isAuthenticated = !!accessToken && !!user;

  const login = (accessToken: string,  user: User) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("user_data", JSON.stringify(user));
    setAccessToken(accessToken);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_data");
    setAccessToken(null);
    setUser(null);
  };

  setLogoutFunction(logout);

  return (
    <AuthContext.Provider value={{ isAuthenticated, accessToken, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
