import React from 'react';
import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-md bg-[#1B1230] border border-[#352746] p-6 shadow-2xl relative"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 id="confirm-modal-title" className="text-base font-heading font-semibold text-[#F7F4FC] uppercase tracking-wide">
              {title}
            </h3>
            <p className="mt-2 text-xs text-[#AAA2B8] leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-[#AAA2B8] hover:text-[#F7F4FC] p-1 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#352746]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#AAA2B8] hover:text-[#F7F4FC] border border-[#352746] hover:bg-[#120D20] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-[#D4AF37] text-[#120D20] hover:bg-[#F2D675] font-semibold transition-colors cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
