import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ children, onClose }: ModalProps) {
  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Content wrapper to handle scrolling for very tall modals */}
      <div className="relative z-10 w-full max-w-xl max-h-full overflow-y-auto flex items-center justify-center">
        <div className="w-full my-auto">
           {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
