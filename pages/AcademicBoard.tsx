import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MessageSquare, Award, User as UserIcon, HelpCircle } from 'lucide-react';
import { AcademicService } from '../services/academic';
import { Question } from '../types';
import { toast } from 'react-hot-toast';

export const AcademicBoard: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const data = await AcademicService.getQuestions();
      setQuestions(data);
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AcademicService.createQuestion({
        title,
        description,
        reward_points: Number(reward),
        is_anonymous: isAnonymous
      });
      toast.success('Question posted successfully');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setReward(0);
      loadQuestions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to post question');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blake-100 flex items-center gap-2">
            <Award className="text-accent-500" />
            Academic Board
          </h1>
          <p className="text-blake-400 text-sm mt-1">Anonymous peer-to-peer knowledge exchange</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blake-100 text-blake-950 px-4 py-2 rounded-lg font-medium hover:bg-white transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Ask Question
        </button>
      </div>

      {/* Question List */}
      {loading ? (
        <div className="text-center py-12 text-blake-500">Loading knowledge base...</div>
      ) : (
        <div className="grid gap-4">
          {questions.map((q) => (
            <Link 
              key={q.id} 
              to={`/academic/${q.id}`}
              className="bg-blake-900/30 border border-blake-800 p-4 rounded-xl hover:border-blake-600 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-blake-200 group-hover:text-white transition-colors">
                  {q.title}
                </h3>
                {q.reward_points > 0 && (
                  <span className="bg-accent-500/10 text-accent-500 text-xs px-2 py-1 rounded-full border border-accent-500/20 font-mono">
                    +{q.reward_points} PTS
                  </span>
                )}
              </div>
              
              <p className="text-blake-400 text-sm line-clamp-2 mb-4 font-serif italic">
                {q.description}
              </p>

              <div className="flex items-center justify-between text-xs text-blake-500 border-t border-blake-800/50 pt-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <UserIcon size={12} />
                    {q.is_anonymous ? 'Anonymous' : q.author_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {q.answer_count} Answers
                  </span>
                  {q.accepted_answer_id && (
                    <span className="text-accent-500 flex items-center gap-1">
                      <Award size={12} />
                      Solved
                    </span>
                  )}
                </div>
                <span className="font-mono opacity-60">
                  {new Date(q.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}

          {questions.length === 0 && (
            <div className="text-center py-12 border border-dashed border-blake-800 rounded-xl">
              <HelpCircle className="mx-auto text-blake-600 mb-2" size={32} />
              <p className="text-blake-500">No questions yet. Be the first to ask!</p>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-blake-900 border border-blake-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-blake-100 mb-4">Post Academic Question</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blake-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-blake-950 border border-blake-800 rounded-lg px-4 py-2 text-blake-200 focus:border-blake-600 outline-none"
                  placeholder="e.g., Analysis of Late Capitalist Realism"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-blake-400 mb-1">Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-blake-950 border border-blake-800 rounded-lg px-4 py-2 text-blake-200 focus:border-blake-600 outline-none resize-none font-serif"
                  placeholder="Provide detailed context..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blake-400 mb-1">Reward (Points)</label>
                  <input
                    type="number"
                    min="0"
                    value={reward}
                    onChange={(e) => setReward(Number(e.target.value))}
                    className="w-full bg-blake-950 border border-blake-800 rounded-lg px-4 py-2 text-blake-200 focus:border-blake-600 outline-none"
                  />
                </div>
                <div className="flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-blake-300 select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-4 h-4 rounded border-blake-600 bg-blake-950 text-blake-100 focus:ring-0 focus:ring-offset-0"
                    />
                    Post Anonymously
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-blake-700 text-blake-400 hover:bg-blake-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 rounded-lg bg-blake-100 text-blake-950 font-medium hover:bg-white transition-colors"
                >
                  Post Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
