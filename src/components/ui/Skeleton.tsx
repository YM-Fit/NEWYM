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
  const baseClasses = 'bg-zinc-800/50';
  
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
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="premium-card-static p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" height={20} width="60%" />
          <Skeleton variant="text" height={16} width="40%" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="rounded" height={12} />
        <Skeleton variant="rounded" height={12} width="80%" />
      </div>
    </div>
  );
}

export function SkeletonTraineeCard() {
  return (
    <div className="premium-card-static p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4 flex-1">
          <Skeleton variant="circular" width={64} height={64} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={24} width="70%" />
            <Skeleton variant="text" height={16} width="50%" />
          </div>
        </div>
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={60} />
      </div>
    </div>
  );
}

export function SkeletonWorkoutCard() {
  return (
    <div className="premium-card-static p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" height={20} width={120} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
      <div className="space-y-3">
        <Skeleton variant="rounded" height={16} width="100%" />
        <Skeleton variant="rounded" height={16} width="85%" />
        <Skeleton variant="rounded" height={16} width="70%" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
