import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ className, icon, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      {icon || <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={20} />}
      <input
        {...props}
        type={showPassword ? 'text' : 'password'}
        className={cn(
          "w-full pl-12 pr-12 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-stone-200 focus:border-stone-200 outline-none transition-all",
          className
        )}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors p-1"
        title={showPassword ? "Hide Password" : "Show Password"}
      >
        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
};

export default PasswordInput;
