import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../common';
import { UserWatchlist } from '../../services/watchlistService';
import { useMarketStore } from '../../store/useMarketStore';

interface CreateWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWatchlistModal: React.FC<CreateWatchlistModalProps> = ({ isOpen, onClose }) => {
  const { createUserWatchlist, userWatchlists } = useMarketStore();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Watchlist name is required');
      return;
    }
    if (trimmed.length > 40) {
      setError('Watchlist name cannot exceed 40 characters');
      return;
    }
    if (userWatchlists.some((w) => w.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`A watchlist named "${trimmed}" already exists`);
      return;
    }
    if (userWatchlists.length >= 10) {
      setError('Maximum of 10 watchlists reached per user');
      return;
    }

    setIsSubmitting(true);
    const created = await createUserWatchlist(trimmed);
    setIsSubmitting(false);
    if (created) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Watchlist"
      subtitle="Organize monitored stocks into a targeted portfolio list"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'Creating...' : 'Create Watchlist'}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="watchlist-name-input" className="block text-xs font-medium text-slate-300 mb-1.5">
            Watchlist Name
          </label>
          <input
            id="watchlist-name-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Growth Tech, EV Breakouts, Dividend Yield"
            maxLength={40}
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all"
          />
          <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-500">
            <span>Max 40 characters</span>
            <span>{name.length}/40</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

interface RenameWatchlistModalProps {
  watchlist: UserWatchlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RenameWatchlistModal: React.FC<RenameWatchlistModalProps> = ({
  watchlist,
  isOpen,
  onClose,
}) => {
  const { renameUserWatchlist, userWatchlists } = useMarketStore();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (watchlist && isOpen) {
      setName(watchlist.name);
      setError(null);
      setIsSubmitting(false);
    }
  }, [watchlist, isOpen]);

  if (!watchlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Watchlist name is required');
      return;
    }
    if (trimmed.length > 40) {
      setError('Watchlist name cannot exceed 40 characters');
      return;
    }
    if (
      trimmed.toLowerCase() !== watchlist.name.toLowerCase() &&
      userWatchlists.some((w) => w.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      setError(`A watchlist named "${trimmed}" already exists`);
      return;
    }

    setIsSubmitting(true);
    const success = await renameUserWatchlist(watchlist.id, trimmed);
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Watchlist"
      subtitle={`Updating name for "${watchlist.name}"`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim() || name.trim() === watchlist.name}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Save Name'}</span>
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rename-watchlist-input" className="block text-xs font-medium text-slate-300 mb-1.5">
            New Name
          </label>
          <input
            id="rename-watchlist-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            maxLength={40}
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-subtle border border-border focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

interface DeleteWatchlistModalProps {
  watchlist: UserWatchlist | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteWatchlistModal: React.FC<DeleteWatchlistModalProps> = ({
  watchlist,
  isOpen,
  onClose,
}) => {
  const { deleteUserWatchlist } = useMarketStore();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!watchlist) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    const success = await deleteUserWatchlist(watchlist.id);
    setIsDeleting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Watchlist"
      subtitle={`Permanently remove "${watchlist.name}"`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Watchlist'}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs sm:text-sm">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-100">
              Are you sure you want to delete &ldquo;{watchlist.name}&rdquo;?
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              This will remove this watchlist and its {watchlist.stockCount} mapped stocks from this grouping. Your master stock data and history remain completely unaffected.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
