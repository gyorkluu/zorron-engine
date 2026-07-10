import { memo, useState } from 'react';
import { getIllustrationUrl } from '@/assets/illustrations';
import { cn } from '@/lib/utils';

export interface EmptyStateIllustrationProps {
  illustration: string;
  alt?: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'auto';
}

function EmptyStateIllustrationImpl({
  illustration,
  alt = '',
  className,
  aspectRatio = 'video',
}: EmptyStateIllustrationProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = getIllustrationUrl(illustration);

  if (error || !url) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        aspectRatio === 'video' && 'aspect-video w-full max-w-lg',
        aspectRatio === 'square' && 'aspect-square w-full max-w-[280px]',
        aspectRatio === 'auto' && 'w-full max-w-md',
        className,
      )}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-800/20 to-slate-800/40">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/10 to-transparent" />
        </div>
      )}
      <img
        src={url}
        alt={alt}
        className={cn(
          'relative z-10 h-full w-full object-contain transition-all duration-700',
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105',
        )}
        style={{
          filter: 'drop-shadow(0 0 18px rgba(34,211,238,0.4)) drop-shadow(0 0 40px rgba(34,211,238,0.18)) drop-shadow(0 0 70px rgba(139,92,246,0.12))',
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
      <div className="pointer-events-none absolute inset-0 z-0 scale-125 opacity-30 blur-3xl">
        <img
          src={url}
          alt=""
          className="h-full w-full object-contain hue-rotate-[30deg] saturate-150"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export const EmptyStateIllustration = memo(EmptyStateIllustrationImpl);
