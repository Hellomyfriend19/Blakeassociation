import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, Check, MessageCircle, User as UserIcon, Flag } from 'lucide-react';
import { Button } from '../components/Button';
import { AuthService } from '../services/auth';
import { ReportModal } from '../components/ReportModal';
import toast from 'react-hot-toast';

interface Answer {
  id: string;
  content: string;
  created_at: string;
  is_accepted: number;
  score: number;
}

interface Question {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_solved: number;
  views: number;
}

export const QuestionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthor, setIsAuthor] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Report State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const handleReport = (id: string) => {
    setReportingId(id);
    setReportModalOpen(true);
  };

  useEffect(() => {
    if (id) {
      fetchQuestionDetails();
      checkIfAuthor();
    }
  }, [id]);

  const fetchQuestionDetails = async () => {
    try {
      const response = await fetch(`/api/qa/questions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch question');
      const data = await response.json();
      setQuestion(data.question);
      setAnswers(data.answers);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load question details');
    } finally {
      setLoading(false);
    }
  };

  const checkIfAuthor = async () => {
    try {
      const token = AuthService.getToken();
      if (!token) return;

      const response = await fetch(`/api/qa/questions/${id}/check-author`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAuthor(data.is_author);
      }
    } catch (error) {
      console.error("Error checking author status", error);
    }
  };

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    setSubmitting(true);
    try {
      const token = AuthService.getToken();
      const response = await fetch(`/api/qa/questions/${id}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newAnswer })
      });

      if (!response.ok) throw new Error('Failed to post answer');
      
      toast.success('Answer posted');
      setNewAnswer('');
      fetchQuestionDetails(); // Refresh answers
    } catch (error) {
      console.error(error);
      toast.error('Failed to post answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (answerId: string, type: 'up' | 'down') => {
    try {
      const token = AuthService.getToken();
      const response = await fetch(`/api/qa/answers/${answerId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to vote');
      }
      
      toast.success(`Voted ${type}`);
      fetchQuestionDetails(); // Refresh scores
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!confirm('Accept this answer? This will mark the question as solved and reward the author.')) return;

    try {
      const token = AuthService.getToken();
      const response = await fetch(`/api/qa/answers/${answerId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to accept answer');
      }
      
      toast.success('Answer accepted');
      fetchQuestionDetails(); // Refresh status
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (loading) return <div className="text-center py-12 text-blake-500 font-mono animate-pulse">Loading...</div>;
  if (!question) return <div className="text-center py-12 text-red-500">Question not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button variant="ghost" onClick={() => navigate('/qa')} className="pl-0 hover:pl-2 transition-all">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Board
      </Button>

      {/* Question Header */}
      <div className="space-y-4 border-b border-blake-800 pb-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-light text-white leading-tight">{question.title}</h1>
          {question.is_solved === 1 && (
            <span className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded-full text-xs font-mono border border-emerald-900/50 flex items-center gap-2 whitespace-nowrap">
              <Check className="w-3 h-3" />
              Solved
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-blake-500 font-mono">
          <span>Posted {new Date(question.created_at).toLocaleDateString()}</span>
          <span>•</span>
          <span>{question.views} Views</span>
          <span>•</span>
          <span>Anonymous Author</span>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-blake-300 bg-blake-900/20 p-6 rounded-lg border border-blake-800/50">
          <p className="whitespace-pre-wrap">{question.description}</p>
        </div>
      </div>

      {/* Answers Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-light text-blake-200 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          {answers.length} Answers
        </h3>

        {answers.map(answer => (
          <div 
            key={answer.id} 
            className={`p-6 border rounded-lg transition-all ${
              answer.is_accepted 
                ? 'bg-emerald-950/10 border-emerald-900/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                : 'bg-blake-900/10 border-blake-800'
            }`}
          >
            <div className="flex gap-4">
              {/* Vote Controls */}
              <div className="flex flex-col items-center gap-2 pt-1">
                <button 
                  onClick={() => handleVote(answer.id, 'up')}
                  className="p-1 text-blake-500 hover:text-emerald-400 transition-colors"
                  title="Upvote"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <span className={`font-mono font-bold ${answer.score > 0 ? 'text-emerald-400' : answer.score < 0 ? 'text-red-400' : 'text-blake-400'}`}>
                  {answer.score}
                </span>
                {/* Downvote could be added here if needed */}
              </div>

              {/* Answer Content */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="text-xs text-blake-500 font-mono flex items-center gap-2">
                    <UserIcon className="w-3 h-3" />
                    Anonymous Scholar
                    {answer.is_accepted === 1 && (
                      <span className="text-emerald-500 flex items-center gap-1 ml-2">
                        <Check className="w-3 h-3" />
                        Accepted Answer
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-blake-600">
                    {new Date(answer.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleReport(answer.id)}
                    className="text-blake-600 hover:text-red-500 transition-colors p-1 ml-2"
                    title="Report Abuse"
                  >
                    <Flag size={14} />
                  </button>
                </div>
                
                <div className="text-blake-200 text-sm whitespace-pre-wrap leading-relaxed">
                  {answer.content}
                </div>

                {/* Actions */}
                {isAuthor && !question.is_solved && (
                  <div className="pt-2 flex justify-end">
                    <button 
                      onClick={() => handleAcceptAnswer(answer.id)}
                      className="text-xs flex items-center gap-2 text-blake-500 hover:text-emerald-400 transition-colors border border-blake-800 hover:border-emerald-900 px-3 py-1.5 rounded-full"
                    >
                      <Check className="w-3 h-3" />
                      Accept Answer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {answers.length === 0 && (
          <div className="text-center py-8 text-blake-600 font-mono text-sm italic">
            No answers yet. Be the first to contribute.
          </div>
        )}
      </div>

      {/* Post Answer Form */}
      <div className="bg-blake-900/30 border border-blake-800 p-6 rounded-lg mt-8">
        <h3 className="text-lg font-light text-white mb-4">Contribute an Answer</h3>
        <form onSubmit={handlePostAnswer} className="space-y-4">
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            className="w-full bg-blake-950 border border-blake-700 text-blake-100 px-4 py-3 text-sm focus:outline-none focus:border-blake-400 transition-colors placeholder-blake-700 min-h-[120px] resize-y font-sans"
            placeholder="Type your answer here... (Markdown supported)"
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitting} disabled={!newAnswer.trim()}>
              Post Answer
            </Button>
          </div>
        </form>
      </div>

      <ReportModal 
        isOpen={reportModalOpen} 
        onClose={() => setReportModalOpen(false)} 
        contentId={reportingId || ''} 
        contentType="answer" 
      />
    </div>
  );
};
