import React from 'react';

interface BrandHeaderProps {
  className?: string;
}

export default function BrandHeader({ className = '' }: BrandHeaderProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      <div className="flex items-center gap-3">
        <h1 className="text-white text-lg">BLACK SWAN</h1>
        <span className="h-5 w-px bg-white/30" aria-hidden="true" />
        <span className="text-white/70 text-sm tracking-wide uppercase">Clear Sky</span>
      </div>
    </div>
  );
}
