interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const baseClasses = 'bg-surface/60 relative overflow-hidden';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-label="טוען..."
      role="status"
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      )}
      {animation === 'pulse' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-surface/40 to-transparent animate-shimmer" style={{ animationDuration: '2s' }} />
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="premium-card-static p-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} animation="wave" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={20} width="60%" animation="wave" />
          <Skeleton variant="text" height={16} width="40%" animation="wave" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="rounded" height={12} animation="wave" />
        <Skeleton variant="rounded" height={12} width="80%" animation="wave" />
      </div>
    </div>
  );
}

export function SkeletonTraineeCard() {
  return (
    <div className="premium-card-static p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton variant="circular" width={64} height={64} animation="wave" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={24} width="70%" animation="wave" />
            <Skeleton variant="text" height={16} width="50%" animation="wave" />
          </div>
        </div>
        <Skeleton variant="rounded" width={80} height={32} animation="wave" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="rounded" height={60} animation="wave" />
        <Skeleton variant="rounded" height={60} animation="wave" />
      </div>
    </div>
  );
}

export function SkeletonWorkoutCard() {
  return (
    <div className="premium-card-static p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" height={20} width={120} animation="wave" />
        <Skeleton variant="rounded" width={60} height={24} animation="wave" />
      </div>
      <div className="space-y-3">
        <Skeleton variant="rounded" height={16} width="100%" animation="wave" />
        <Skeleton variant="rounded" height={16} width="85%" animation="wave" />
        <Skeleton variant="rounded" height={16} width="70%" animation="wave" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
