import { Question, Answer } from '../types';

const API_URL = '/api/academic';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const AcademicService = {
  async getQuestions(page = 1, limit = 10): Promise<Question[]> {
    const res = await fetch(`${API_URL}/questions?page=${page}&limit=${limit}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  },

  async getQuestion(id: string): Promise<Question & { answers: Answer[] }> {
    const res = await fetch(`${API_URL}/questions/${id}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch question');
    return res.json();
  },

  async createQuestion(data: { title: string; description: string; reward_points: number; is_anonymous: boolean }) {
    const res = await fetch(`${API_URL}/questions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create question');
    }
    return res.json();
  },

  async submitAnswer(questionId: string, data: { content: string; is_anonymous: boolean }) {
    const res = await fetch(`${API_URL}/questions/${questionId}/answers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to submit answer');
    }
    return res.json();
  },

  async acceptAnswer(questionId: string, answerId: string) {
    const res = await fetch(`${API_URL}/questions/${questionId}/accept`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ answer_id: answerId })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to accept answer');
    }
    return res.json();
  },

  async vote(targetType: 'question' | 'answer', targetId: string, value: 1 | -1) {
    const res = await fetch(`${API_URL}/vote`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ target_type: targetType, target_id: targetId, value })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to vote');
    }
    return res.json();
  }
};
