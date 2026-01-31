import React from 'react';
import { TranslationSet } from '../types';

const LogisticsView: React.FC<{ t: TranslationSet }> = ({ t }) => {
  return (
    <div className="p-8 bg-card-bg rounded-3xl border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-4">🚚 Логистический план</h2>
      <p className="text-white/70">Здесь будет план логистических операций</p>
    </div>
  );
};

export default LogisticsView;
