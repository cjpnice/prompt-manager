import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
    >
      <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
        theme === 'light'
          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-200'
          : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-300 dark:shadow-indigo-900'
      }`}>
        {theme === 'light' ? (
          <Sun className="w-5 h-5 animate-in spin-in fade-in duration-300" />
        ) : (
          <Moon className="w-5 h-5 animate-in spin-in fade-in duration-300" />
        )}
      </div>
      {/* Ripple effect */}
      <span className={`absolute inset-0 rounded-lg transition-opacity duration-300 ${
        theme === 'light' ? 'bg-orange-400' : 'bg-indigo-500'
      } opacity-0 hover:opacity-20 animate-pulse`} />
    </button>
  );
};
