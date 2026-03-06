import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { db } from '../services/db';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'listing' | 'answer';
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, contentId, contentType }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for the report.");
      return;
    }

    setIsSubmitting(true);
    try {
      await db.reportContent(contentId, reason);
      toast.success("Report submitted. Thank you for helping keep our community safe.");
      onClose();
      setReason('');
    } catch (error) {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-blake-900 border border-blake-700 rounded-lg shadow-xl w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-blake-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-red-400">
            <AlertTriangle size={24} />
            <h2 className="text-xl font-medium">Report Abuse</h2>
          </div>

          <p className="text-blake-300 text-sm mb-6">
            Please describe why this {contentType} violates our community guidelines. 
            Reports are reviewed by administration.
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for reporting..."
              className="w-full h-32 bg-blake-950 border border-blake-700 rounded-md p-3 text-blake-200 focus:outline-none focus:border-red-500/50 resize-none mb-4"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-blake-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <Button 
                type="submit" 
                isLoading={isSubmitting}
                className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800"
              >
                Submit Report
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
