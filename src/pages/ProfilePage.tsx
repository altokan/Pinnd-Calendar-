import React from 'react';
import { useTheme } from '../ThemeContext';
import { useAuth } from '../hooks/useAuth';

export default function ProfilePage() {
  const { theme, updateTheme } = useTheme();
  const { profile } = useAuth();

  const colors = [
    { name: 'Classic Stone', primary: '#1c1917' },
    { name: 'Ocean Blue', primary: '#0ea5e9' },
    { name: 'Forest Green', primary: '#10b981' },
    { name: 'Soft Rose', primary: '#f43f5e' },
    { name: 'Royal Purple', primary: '#8b5cf6' },
  ];

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-12">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">Personalize</h2>
        <p className="text-stone-500">Customize your app appearance</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border p-8 space-y-8">
        <h3 className="font-bold text-lg">Theme Color</h3>
        <div className="flex flex-wrap gap-4">
          {colors.map(c => (
            <button 
              key={c.primary}
              onClick={() => updateTheme({ primaryColor: c.primary })}
              className={`w-12 h-12 rounded-2xl transition-all transform hover:scale-110 ${theme.primaryColor === c.primary ? 'ring-4 ring-offset-2 ring-black' : ''}`}
              style={{ backgroundColor: c.primary }}
            />
          ))}
        </div>
        
        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl">
          <span className="font-medium text-sm">Glassmorphism Effect</span>
          <input 
            type="checkbox" 
            checked={theme.glassmorphism} 
            onChange={e => updateTheme({ glassmorphism: e.target.checked })}
            className="w-5 h-5 accent-black"
          />
        </div>
      </div>
    </div>
  );
}
