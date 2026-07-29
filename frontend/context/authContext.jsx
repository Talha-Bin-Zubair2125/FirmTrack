import { createContext, useState } from "react";

export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [adminInfo, setAdminInfo] = useState(null); // for admin
  const [users, setUsers] = useState(null); // for employees
  const value = { adminInfo, setAdminInfo, users, setUsers };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
