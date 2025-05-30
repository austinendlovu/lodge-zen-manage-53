
import { UserRole } from "./types";

interface DecodedToken {
  id: string;
  sub: string;
  role: UserRole;
  exp: number;
  iat: number;
  username: string;
}

export function parseJwt(token: string): DecodedToken | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT token:", error);
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  try {
    const decoded = parseJwt(token);
    if (!decoded) return false;
    
    // Check if token is expired
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
}

export function getUserRoleFromToken(): UserRole | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  try {
    const decoded = parseJwt(token);
    return decoded?.role || null;
  } catch (error) {
    console.error("Error getting user role from token:", error);
    return null;
  }
}

export function getUserIdFromToken(): string | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  try {
    const decoded = parseJwt(token);
    return decoded?.id || null;
  } catch (error) {
    console.error("Error getting user ID from token:", error);
    return null;
  }
}

export function getUsername(): string | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  
  try {
    const decoded = parseJwt(token);
    return decoded?.username || null;
  } catch (error) {
    console.error("Error getting username from token:", error);
    return null;
  }
}

export function clearAuthToken(): void {
  localStorage.removeItem('authToken');
}
