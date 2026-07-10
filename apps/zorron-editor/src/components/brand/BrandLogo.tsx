import { memo } from 'react';

export interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

function BrandLogoImpl({ size = 28, className = '', showText = true }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="zorron-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="zorron-logo-inner" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="zorron-logo-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#zorron-logo-grad)" filter="url(#zorron-logo-glow)" opacity="0.9" />
        <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#zorron-logo-inner)" />
        <path
          d="M12 28L16 12L20 22L24 12L28 28"
          stroke="url(#zorron-logo-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="20" cy="20" r="1.5" fill="#22d3ee" />
      </svg>
      {showText && (
        <span className="bg-gradient-to-r from-cyan-300 via-indigo-300 to-purple-300 bg-clip-text text-lg font-bold tracking-tight text-transparent">
          Zorron
        </span>
      )}
    </div>
  );
}

export const BrandLogo = memo(BrandLogoImpl);
