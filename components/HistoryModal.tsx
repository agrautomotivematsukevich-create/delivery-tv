import React from 'react';
import { TranslationSet } from '../types';

const HistoryModal: React.FC<{ 
  t: TranslationSet; 
  onClose: () => void;
}> = ({ t, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="bg-[#0F0F12] border border-white/10 p-8 rounded-3xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">📋 История проблем</h2>
        <p className="text-white/70 mb-6">История зарегистрированных проблем</p>
        <button onClick={onClose} className="w-full bg-accent-blue text-white py-3 rounded-xl">
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default HistoryModal;
