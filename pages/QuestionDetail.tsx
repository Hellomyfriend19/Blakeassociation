import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Award, ThumbsUp, ThumbsDown, User as UserIcon, CheckCircle } from 'lucide-react';
import { AcademicService } from '../services/academic';
import { Question, Answer, User } from '../types';
import { AuthService } from '../services/auth';
import { toast } from 'react-hot-toast';

export const QuestionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question & { answers: Answer[] } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [newAnswer, setNewAnswer] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [q, u] = await Promise.all([
        AcademicService.getQuestion(id!),
        AuthService.getCurrentUser()
      ]);
      setQuestion(q);
      setCurrentUser(u);
    } catch (error) {
      toast.error('Failed to load question');
      navigate('/academic');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    try {
      await AcademicService.submitAnswer(id!, {
        content: newAnswer,
        is_anonymous: isAnonymous
      });
      toast.success('Answer submitted');
      setNewAnswer('');
      loadData(); // Refresh
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit answer');
    }
  };

  const handleAccept = async (answerId: string) => {
    if (!question || currentUser?.id !== question.author_id) return;
    
    try {
      await AcademicService.acceptAnswer(question.id, answerId);
      toast.success('Answer accepted');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept answer');
    }
  };

  const handleVote = async (type: 'question' | 'answer', targetId: string, value: 1 | -1) => {
    try {
      await AcademicService.vote(type, targetId, value);
      loadData(); // Refresh to show new score
    } catch (error: any) {
      toast.error(error.message || 'Failed to vote');
    }
  };

  if (loading) return <div className="text-center py-12 text-blake-500">Loading...</div>;
  if (!question) return <div className="text-center py-12 text-blake-500">Question not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/academic')}
        className="flex items-center gap-2 text-blake-400 hover:text-blake-200 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Board
      </button>

      {/* Question Card */}
      <div className="bg-blake-900/30 border border-blake-800 rounded-2xl p-6 md:p-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-blake-100">{question.title}</h1>
          {question.reward_points > 0 && (
            <span className="bg-accent-500/10 text-accent-500 px-3 py-1 rounded-full border border-accent-500/20 font-mono text-sm">
              +{question.reward_points} PTS
            </span>
          )}
        </div>

        <div className="prose prose-invert prose-blake max-w-none mb-8 font-serif text-lg leading-relaxed text-blake-300">
          <p>{question.description}</p>
        </div>

        <div className="flex items-center justify-between border-t border-blake-800/50 pt-4 text-sm text-blake-500">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleVote('question', question.id, 1)}
                className={`hover:text-accent-500 transition-colors ${question.user_vote === 1 ? 'text-accent-500' : ''}`}
              >
                <ThumbsUp size={16} />
              </button>
              <span className="font-mono font-bold text-blake-300">{question.score}</span>
              <button 
                onClick={() => handleVote('question', question.id, -1)}
                className={`hover:text-red-500 transition-colors ${question.user_vote === -1 ? 'text-red-500' : ''}`}
              >
                <ThumbsDown size={16} />
              </button>
            </div>
            
            <span className="flex items-center gap-2">
              <UserIcon size={16} />
              {question.is_anonymous ? 'Anonymous Scholar' : question.author_name}
            </span>
            
            <span className="font-mono opacity-60">
              {new Date(question.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Answers Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-blake-200 flex items-center gap-2">
          <MessageSquare className="text-blake-400" />
          {question.answers.length} Responses
        </h2>

        {question.answers.map((answer) => (
          <div 
            key={answer.id} 
            className={`
              p-6 rounded-xl border transition-all
              ${question.accepted_answer_id === answer.id 
                ? 'bg-accent-500/5 border-accent-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                : 'bg-blake-900/20 border-blake-800 hover:border-blake-700'}
            `}
          >
            <div className="flex gap-4">
              {/* Vote Column */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <button 
                  onClick={() => handleVote('answer', answer.id, 1)}
                  className={`hover:text-accent-500 transition-colors ${answer.user_vote === 1 ? 'text-accent-500' : ''}`}
                >
                  <ThumbsUp size={16} />
                </button>
                <span className="font-mono font-bold text-sm text-blake-300">{answer.score}</span>
                <button 
                  onClick={() => handleVote('answer', answer.id, -1)}
                  className={`hover:text-red-500 transition-colors ${answer.user_vote === -1 ? 'text-red-500' : ''}`}
                >
                  <ThumbsDown size={16} />
                </button>

                {question.accepted_answer_id === answer.id && (
                  <CheckCircle className="text-accent-500 mt-2" size={20} />
                )}
              </div>

              {/* Content Column */}
              <div className="flex-1">
                <div className="prose prose-invert prose-sm max-w-none mb-4 text-blake-300 font-serif">
                  <p>{answer.content}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-blake-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <UserIcon size={12} />
                      {answer.is_anonymous ? 'Anonymous Peer' : answer.author_name}
                    </span>
                    <span className="font-mono opacity-60">
                      {new Date(answer.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Accept Button (Only for author) */}
                  {currentUser?.id === question.author_id && !question.accepted_answer_id && (
                    <button
                      onClick={() => handleAccept(answer.id)}
                      className="flex items-center gap-1 text-accent-500 hover:text-accent-400 font-medium transition-colors px-3 py-1 rounded-full border border-accent-500/20 hover:bg-accent-500/10"
                    >
                      <Award size={14} />
                      Accept Answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Answer Form */}
        <div className="bg-blake-900/30 border border-blake-800 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blake-200 mb-4">Contribute an Answer</h3>
          <form onSubmit={handleSubmitAnswer}>
            <textarea
              required
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={5}
              className="w-full bg-blake-950 border border-blake-800 rounded-lg px-4 py-3 text-blake-200 focus:border-blake-600 outline-none resize-none font-serif mb-4"
              placeholder="Share your knowledge..."
            />
            
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer text-blake-400 text-sm select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-blake-600 bg-blake-950 text-blake-100 focus:ring-0 focus:ring-offset-0"
                />
                Answer Anonymously
              </label>
              
              <button
                type="submit"
                disabled={!newAnswer.trim()}
                className="bg-blake-100 text-blake-950 px-6 py-2 rounded-lg font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Answer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
