import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

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
  sm: { width: '40px', height: '40px' },
  md: { width: '56px', height: '56px' },
  lg: { width: '72px', height: '72px' },
  xl: { width: '96px', height: '96px' },
};

const responsiveSizeMap: Record<LogoSize, { mobile: string; tablet: string; desktop: string }> = {
  sm: { mobile: '32px', tablet: '40px', desktop: '48px' },
  md: { mobile: '48px', tablet: '56px', desktop: '64px' },
  lg: { mobile: '64px', tablet: '72px', desktop: '80px' },
  xl: { mobile: '80px', tablet: '96px', desktop: '120px' },
};

export default function Logo({
  size = 'md',
  variant = 'default',
  className = '',
  showText = false,
  animated = true,
  onClick,
}: LogoProps) {
  const { theme, isDark } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Determine which logo to use based on theme
  const logoSrc = isDark 
    ? '/logo-dark-bg.png' 
    : '/logo-white-bg.jpg';

  // Fallback to white bg if dark version fails
  const fallbackSrc = '/logo-white-bg.jpg';

  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [logoSrc]);

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
    width: `clamp(${responsiveDimensions.mobile}, 4vw, ${responsiveDimensions.desktop})`,
    height: `clamp(${responsiveDimensions.mobile}, 4vw, ${responsiveDimensions.desktop})`,
    maxWidth: dimensions.width,
    maxHeight: dimensions.height,
  };

  return (
    <div
      className={baseClasses}
      style={containerStyle}
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
        <div className="absolute inset-0 bg-emerald-500/20 rounded-xl blur-xl opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10" />
      )}

      {/* Loading skeleton */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/20 to-emerald-800/20 rounded-xl animate-pulse" />
      )}

      {/* Logo image */}
      <img
        src={imageError ? fallbackSrc : logoSrc}
        alt="FITNESS NUTRITION - YM Coach Logo"
        className={imageClasses}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        decoding="async"
      />

      {/* Fallback text if image fails */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-xl">
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
