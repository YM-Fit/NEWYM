import { useState } from 'react';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
export type LogoVariant = 'default' | 'minimal';

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  showText?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

const sizeMap: Record<LogoSize, { width: string; height: string }> = {
  sm: { width: '56px', height: '56px' },
  md: { width: '80px', height: '80px' },
  lg: { width: '120px', height: '120px' },
  xl: { width: '160px', height: '160px' },
};

const responsiveSizeMap: Record<LogoSize, { mobile: string; tablet: string; desktop: string }> = {
  sm: { mobile: '48px', tablet: '56px', desktop: '72px' },
  md: { mobile: '64px', tablet: '80px', desktop: '100px' },
  lg: { mobile: '96px', tablet: '120px', desktop: '150px' },
  xl: { mobile: '120px', tablet: '160px', desktop: '200px' },
};

export default function Logo({
  size = 'md',
  variant = 'default',
  className = '',
  showText = false,
  animated = true,
  onClick,
}: LogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const logoSrc = '/logo-white-bg.png';
  const fallbackSrc = '/logo-dark-bg.png';

  const handleImageError = () => {
    if (logoSrc !== fallbackSrc) {
      setImageError(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const dimensions = sizeMap[size];
  const responsiveDimensions = responsiveSizeMap[size];

  const baseClasses = `
    relative inline-block
    transition-all duration-300 ease-out
    ${animated ? 'animate-fade-in' : ''}
    ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');


  const imageClasses = `
    transition-opacity duration-300
    ${imageLoaded ? 'opacity-100' : 'opacity-0'}
    ${onClick ? 'hover:drop-shadow-[0_0_12px_rgba(74,107,42,0.4)]' : ''}
  `.trim().replace(/\s+/g, ' ');

  const containerStyle: React.CSSProperties = {
    width: `clamp(${responsiveDimensions.mobile}, 6vw, ${responsiveDimensions.desktop})`,
    height: `clamp(${responsiveDimensions.mobile}, 6vw, ${responsiveDimensions.desktop})`,
    minWidth: dimensions.width,
    minHeight: dimensions.height,
  };

  return (
    <div
      className={baseClasses}
      style={{
        ...containerStyle,
        backgroundColor: 'transparent',
      }}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label="FITNESS NUTRITION Logo"
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {/* Glow effect on hover */}
      {onClick && (
        <div className="absolute inset-0 bg-primary-500/20 rounded-xl blur-xl opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10" />
      )}

      {/* Loading skeleton */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700/20 to-primary-800/20 rounded-xl animate-pulse" />
      )}

      {/* Logo image with background blending */}
      <div 
        className="relative w-full h-full"
        style={{
          backgroundColor: 'transparent',
          borderRadius: '8px',
        }}
      >
        <img
          src={imageError ? fallbackSrc : logoSrc}
          alt="FITNESS NUTRITION - YM Coach Logo"
          className={imageClasses}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
          }}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Fallback text if image fails */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-700 to-primary-800 rounded-xl">
          <span className="text-white font-bold text-lg">YM</span>
        </div>
      )}

      {/* Optional text below logo */}
      {showText && variant === 'default' && (
        <div className="mt-2 text-center">
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            FITNESS NUTRITION
          </p>
        </div>
      )}
    </div>
  );
}
