const TOKEN_STORAGE_KEY = 'boluo-auth-token-v250717';

export interface TokenStorage {
  token: string | null;
  setToken: (token: string | null) => void;
  getToken: () => string | null;
  clearToken: () => void;
}

class TokenManager implements TokenStorage {
  private _token: string | null = null;

  constructor() {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      this._token = stored;
    } catch (error) {
      console.warn('Failed to load token from localStorage:', error);
      this._token = null;
    }
  }

  private saveTokenToStorage(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to save token to localStorage:', error);
    }
  }

  get token(): string | null {
    return this._token;
  }

  setToken(token: string | null): void {
    this._token = token;
    this.saveTokenToStorage(token);
  }

  getToken(): string | null {
    return this._token;
  }

  clearToken(): void {
    this._token = null;
    this.saveTokenToStorage(null);
  }
}

export const tokenManager = new TokenManager();

export const getAuthToken = (): string | null => tokenManager.getToken();
export const setAuthToken = (token: string | null): void => tokenManager.setToken(token);
export const clearAuthToken = (): void => tokenManager.clearToken();
