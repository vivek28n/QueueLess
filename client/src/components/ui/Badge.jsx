import React from 'react';

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variants = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    indigo: 'bg-indigo-950/60 text-indigo-300 border-indigo-700/50',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-700/50',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-700/50',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-700/50',
  };

  const dotColors = {
    default: 'bg-slate-400',
    indigo: 'bg-indigo-400 animate-pulse',
    cyan: 'bg-cyan-400 animate-pulse',
    success: 'bg-emerald-400 animate-pulse',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full backdrop-blur-sm ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotColors[variant] || dotColors.default}`}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
