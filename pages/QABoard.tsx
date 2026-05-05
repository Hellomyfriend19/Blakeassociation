import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MessageSquare, CheckCircle, Clock, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AuthService } from '../services/auth';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface Question {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_solved: number;
  views: number;
  answer_count: number;
}

export const QABoard: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAskModal, setShowAskModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const token = AuthService.getToken();
      const response = await fetch(`${API_BASE}/qa/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch questions');
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.title.trim() || !newQuestion.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    setSubmitting(true);
    try {
      const token = AuthService.getToken();
      const response = await fetch(`${API_BASE}/qa/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newQuestion)
      });

      if (!response.ok) throw new Error('Failed to post question');
      
      toast.success('Question posted anonymously');
      setNewQuestion({ title: '', description: '' });
      setShowAskModal(false);
      fetchQuestions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-light text-blake-100">Academic Q&A</h1>
          <p className="text-blake-500 text-sm font-mono mt-1">Anonymous Knowledge Exchange</p>
        </div>
        <Button onClick={() => setShowAskModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ask Question
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blake-500 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Search questions..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-blake-900/50 border border-blake-800 text-blake-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blake-600 transition-colors"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-blake-500 font-mono animate-pulse">Loading questions...</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 text-blake-500 font-mono border border-dashed border-blake-800 rounded-lg">
            No questions found. Be the first to ask.
          </div>
        ) : (
          filteredQuestions.map(question => (
            <Link 
              key={question.id} 
              to={`/qa/${question.id}`}
              className="block bg-blake-900/20 border border-blake-800 p-6 hover:border-blake-600 transition-colors group"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <h3 className="text-lg font-medium text-blake-200 group-hover:text-white transition-colors">
                    {question.title}
                  </h3>
                  <p className="text-blake-400 text-sm line-clamp-2">
                    {question.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-blake-500 font-mono pt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(question.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {question.answer_count} Answers
                    </span>
                    {question.is_solved === 1 && (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <CheckCircle className="w-3 h-3" />
                        Solved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-blake-950 border border-blake-700 w-full max-w-lg p-6 shadow-2xl relative">
            <h2 className="text-xl font-light text-white mb-6">Post New Question</h2>
            
            <form onSubmit={handleAskQuestion} className="space-y-4">
              <Input
                label="Title"
                value={newQuestion.title}
                onChange={(e) => setNewQuestion({...newQuestion, title: e.target.value})}
                placeholder="e.g., Explain Quantum Entanglement"
                autoFocus
              />
              
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-widest text-blake-500 font-mono">
                  Description
                </label>
                <textarea
                  value={newQuestion.description}
                  onChange={(e) => setNewQuestion({...newQuestion, description: e.target.value})}
                  className="w-full bg-blake-900 border border-blake-700 text-blake-100 px-3 py-2 text-sm focus:outline-none focus:border-blake-400 transition-colors placeholder-blake-700 min-h-[150px] resize-y"
                  placeholder="Provide details about your question..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setShowAskModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  isLoading={submitting}
                >
                  Post Anonymously
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};