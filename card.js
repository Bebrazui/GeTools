import React, { useState } from 'react';
import { 
  Terminal, 
  Play, 
  X, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

/**
 * Gemini-Inspired Minimalist AI Command Card
 * Акценты:
 * - Максимальная чистота (Flat Design с мягким тонированием)
 * - Отсутствие визуального шума и лишних рамок
 * - Глубокая интеграция с типографикой Google Sans
 */

const App = () => {
  const [status, setStatus] = useState('pending');
  const command = "npm run build --mode production";

  const handleAction = (action) => {
    setStatus(action === 'allow' ? 'allowed' : 'denied');
  };

  if (status !== 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFD] p-6 font-sans">
        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {status === 'allowed' ? (
            <CheckCircle2 className="text-[#0B57D0]" size={24} />
          ) : (
            <AlertCircle className="text-[#B3261E]" size={24} />
          )}
          <span className="text-lg font-medium text-[#1F1F1F]">
            {status === 'allowed' ? 'Выполняется...' : 'Действие отменено'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8FAFD] p-4 font-sans text-[#1F1F1F]">
      <div className="w-full max-w-md bg-white rounded-[24px] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
        
        {/* Заголовок */}
        <div className="flex items-center gap-3 mb-5">
          <Terminal size={20} className="text-[#0B57D0]" />
          <h2 className="text-base font-medium text-[#444746]">Запрос терминала</h2>
        </div>

        {/* Код — максимально просто */}
        <div className="mb-6">
          <div className="bg-[#F0F4F9] px-4 py-3 rounded-xl font-mono text-sm text-[#1F1F1F]">
            {command}
          </div>
        </div>

        {/* Настройка доверия — упрощена до предела */}
        <label className="flex items-center gap-3 mb-8 cursor-pointer group">
          <div className="relative flex items-center">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-10 h-6 bg-[#C4C7C5] rounded-full peer peer-checked:bg-[#0B57D0] transition-colors"></div>
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
          </div>
          <span className="text-sm text-[#444746] group-hover:text-[#1F1F1F] transition-colors">
            Всегда разрешать этот префикс
          </span>
        </label>

        {/* Кнопки — M3 High Emphasis vs Text Button */}
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={() => handleAction('deny')}
            className="px-5 py-2.5 text-[#0B57D0] text-sm font-medium hover:bg-[#F1F3F4] rounded-full transition-colors"
          >
            Отклонить
          </button>
          <button 
            onClick={() => handleAction('allow')}
            className="px-6 py-2.5 bg-[#0B57D0] text-white text-sm font-medium rounded-full hover:shadow-md transition-all active:scale-95"
          >
            Разрешить
          </button>
        </div>

      </div>
    </div>
  );
};

export default App;