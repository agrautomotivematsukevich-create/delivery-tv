import React from 'react';
import { TaskAction, User, TranslationSet } from '../types';

const ActionModal: React.FC<{ 
  action: TaskAction;
  user: User;
  t: TranslationSet;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ action, user, t, onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="bg-[#0F0F12] border border-white/10 p-8 rounded-3xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">
          {action.type === 'start' ? '▶️ Начать задание' : '✅ Завершить задание'}
        </h2>
        <p className="text-white/70 mb-6">Задание ID: {action.id}</p>
        <button onClick={onSuccess} className="w-full bg-accent-green text-white py-3 rounded-xl mb-3">
          Подтвердить
        </button>
        <button onClick={onClose} className="w-full bg-white/10 text-white py-3 rounded-xl">
          Отмена
        </button>
      </div>
    </div>
  );
};

export default ActionModal;
