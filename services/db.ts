import { User, Transaction, AuthResponse, Listing } from '../types';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Error Helper
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errorMessage = data.error;
    } catch (e) {
      // If JSON parsing fails, use text or status text
      const text = await res.text().catch(() => '');
      if (text) errorMessage = `${res.status}: ${text.slice(0, 50)}`; // Truncate if too long
      else errorMessage = res.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return res.json();
};

class ApiService {
  
  // --- AUTH ---
  
  async login(username: string, password?: string, pin?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, pin })
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async register(username: string, password: string, pin?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, pin })
    });
    const data = await handleResponse(res);
    if (data.token) {
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async logout() {
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_URL}/me`, { headers: getHeaders() });
      if (!res.ok) {
        localStorage.removeItem('token');
        return null;
      }
      return res.json();
    } catch (e) {
      return null;
    }
  }

  // --- USER DATA ---

  async getAllUsers(): Promise<User[]> {
    const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    return handleResponse(res);
  }

  async updatePassword(oldPassword: string, newPassword: string): Promise<void> {
    const res = await fetch(`${API_URL}/me/security/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    return handleResponse(res);
  }

  async updatePin(password: string, newPin: string): Promise<void> {
    const res = await fetch(`${API_URL}/me/security/pin`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ password, newPin })
    });
    return handleResponse(res);
  }

  // --- TRANSACTIONS ---

  async transfer(senderId: string, receiverUsername: string, amount: number): Promise<void> {
    const res = await fetch(`${API_URL}/transfer`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ recipientUsername: receiverUsername, amount })
    });
    return handleResponse(res);
  }

  async getTransactions(userId?: string): Promise<Transaction[]> {
    const res = await fetch(`${API_URL}/transactions`, { headers: getHeaders() });
    return handleResponse(res);
  }

  async adminAdjustBalance(adminId: string, targetUserId: string, amount: number): Promise<void> {
    const res = await fetch(`${API_URL}/admin/adjust`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetUserId, amount })
    });
    return handleResponse(res);
  }

  async adminBanUser(targetUserId: string): Promise<{ message: string, is_banned: number }> {
    const res = await fetch(`${API_URL}/admin/users/${targetUserId}/ban`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  }

  // --- MARKETPLACE ---

  async getListings(): Promise<Listing[]> {
    const res = await fetch(`${API_URL}/listings`, { headers: getHeaders() });
    return handleResponse(res);
  }

  async createListing(title: string, description: string, price: number): Promise<void> {
    const res = await fetch(`${API_URL}/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, description, price })
    });
    return handleResponse(res);
  }

  async unlockListing(listingId: string): Promise<{ message: string, description: string }> {
    const res = await fetch(`${API_URL}/listings/${listingId}/unlock`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  }

  async deleteListing(listingId: string): Promise<void> {
    const res = await fetch(`${API_URL}/listings/${listingId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  }

  async boostListing(listingId: string): Promise<void> {
    const res = await fetch(`${API_URL}/listings/${listingId}/boost`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  }

  // --- SHOP ---
  
  async getShopPrices(): Promise<{vip: number, cosmetic: number}> {
    const res = await fetch(`${API_URL}/shop/prices`, { headers: getHeaders() });
    return handleResponse(res);
  }

  async buyVIP(): Promise<void> {
    const res = await fetch(`${API_URL}/shop/vip`, { method: 'POST', headers: getHeaders() });
    return handleResponse(res);
  }

  async buyCosmetic(type: string, value: string): Promise<void> {
    const res = await fetch(`${API_URL}/shop/cosmetic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type, value })
    });
    return handleResponse(res);
  }

  // --- REPORTING ---

  async reportContent(contentId: string, reason: string): Promise<void> {
    const res = await fetch(`${API_URL}/report`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contentId, reason })
    });
    return handleResponse(res);
  }
}

export const db = new ApiService();
