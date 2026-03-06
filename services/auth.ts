import { db } from './db';
import { AuthResponse, User } from '../types';

export class AuthService {
  static async login(username: string, password?: string, pin?: string): Promise<AuthResponse> {
    return db.login(username, password, pin);
  }

  static async register(username: string, password: string, pin?: string): Promise<AuthResponse> {
    return db.register(username, password, pin);
  }

  static async logout() {
    return db.logout();
  }

  static getToken(): string | null {
    return db.getToken();
  }

  static async getCurrentUser(): Promise<User | null> {
    return db.getCurrentUser();
  }
}