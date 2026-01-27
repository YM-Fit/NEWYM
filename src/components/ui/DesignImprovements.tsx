/**
 * דוגמאות קומפוננטים משופרים לעיצוב
 * קובץ זה מכיל דוגמאות לקומפוננטים משופרים שניתן ליישם
 */

import { useState, useEffect } from 'react';
import { Check, X, TrendingUp, Users, Target, Award } from 'lucide-react';

// 1. Floating Label Input
export function FloatingLabelInput({ 
  label, 
  value, 
  onChange, 
  type = 'text',
  error,
  ...props 
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
  [key: string]: any;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value && value.length > 0;
  const isFloating = focused || hasValue;

  return (
    <div className="relative mb-6">
      <label
        className={`absolute right-3 transition-all duration-300 pointer-events-none ${
          isFloating
            ? 'top-2 text-xs text-primary font-semibold'
            : 'top-4 text-sm text-muted'
        }`}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`glass-input w-full pt-6 pb-2 px-3 ${
          error ? 'border-danger' : ''
        }`}
        {...props}
      />
      {error && (
        <p className="absolute left-0 top-full mt-1 text-xs text-danger flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}
      {!error && hasValue && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-success">
          <Check className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

// 2. Animated Stat Card
export function AnimatedStatCard({
  value,
  label,
  icon: Icon,
  trend,
  color = 'emerald',
}: {
  value: string | number;
  label: string;
  icon: any;
  trend?: number;
  color?: 'emerald' | 'cyan' | 'amber' | 'rose';
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'number') {
      const duration = 1000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value]);

  const colorClasses = {
    emerald: 'from-primary/20 to-primary/5 text-primary',
    cyan: 'from-info/20 to-info/5 text-info',
    amber: 'from-warning/20 to-warning/5 text-warning',
    rose: 'from-danger/20 to-danger/5 text-danger',
  };

  return (
    <div className="stat-card group hover:scale-105 transition-transform duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`icon-box bg-gradient-to-br ${colorClasses[color]} animate-pulse-soft`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend > 0 ? 'text-success' : 'text-danger'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={`text-3xl font-bold text-gradient-primary mb-2 ${
        typeof value === 'number' ? 'animate-count-up' : ''
      }`}>
        {typeof value === 'number' ? displayValue : value}
      </div>
      <p className="text-muted text-sm">{label}</p>
    </div>
  );
}

// 3. Skeleton Loader
export function SkeletonCard() {
  return (
    <div className="premium-card-static animate-pulse">
      <div className="h-4 bg-surface/70 rounded w-3/4 mb-3" />
      <div className="h-4 bg-surface/70 rounded w-1/2 mb-4" />
      <div className="h-20 bg-surface/70 rounded" />
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

// 4. Enhanced Empty State
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: any;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 animate-float-slow">
        <Icon className="w-12 h-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted text-center max-w-md mb-6">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="btn-primary px-6 py-3"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// 5. Success Celebration
export function SuccessCelebration({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 backdrop-blur-sm animate-fade-in">
      <div className="premium-card p-8 max-w-md mx-4 text-center animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center mx-auto mb-4 animate-bounce-subtle">
          <Award className="w-10 h-10 text-inverse" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">כל הכבוד!</h3>
        <p className="text-muted">{message}</p>
      </div>
    </div>
  );
}

// 6. Enhanced Button with Loading
export function EnhancedButton({
  children,
  loading,
  icon: Icon,
  variant = 'primary',
  ...props
}: {
  children: React.ReactNode;
  loading?: boolean;
  icon?: any;
  variant?: 'primary' | 'secondary' | 'danger';
  [key: string]: any;
}) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };

  return (
    <button
      className={`${variantClasses[variant]} relative overflow-hidden ${
        loading ? 'opacity-75 cursor-not-allowed' : ''
      }`}
      disabled={loading}
      {...props}
    >
      <span className={`flex items-center justify-center gap-2 ${
        loading ? 'opacity-0' : 'opacity-100'
      } transition-opacity`}>
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </span>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-inverse/30 border-t-inverse rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}

// 7. Progress Bar with Animation
export function AnimatedProgressBar({
  value,
  max = 100,
  label,
  color = 'emerald',
}: {
  value: number;
  max?: number;
  label?: string;
  color?: 'emerald' | 'cyan' | 'amber' | 'rose';
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setAnimatedValue(percentage);
        clearInterval(timer);
      } else {
        setAnimatedValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentage]);

  const colorClasses = {
    emerald: 'from-primary to-primary/80',
    cyan: 'from-info to-info/80',
    amber: 'from-warning to-warning/80',
    rose: 'from-danger to-danger/80',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted">{label}</span>
          <span className="text-sm font-semibold text-foreground">{Math.round(animatedValue)}%</span>
        </div>
      )}
      <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-1000 ease-out shadow-glow`}
          style={{ width: `${animatedValue}%` }}
        />
      </div>
    </div>
  );
}

// 8. Badge with Pulse
export function PulseBadge({
  children,
  variant = 'primary',
  pulse = false,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'warning' | 'danger' | 'info';
  pulse?: boolean;
}) {
  const variantClasses = {
    primary: 'badge-primary',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
  };

  return (
    <span className={`${variantClasses[variant]} relative ${pulse ? 'animate-pulse-soft' : ''}`}>
      {children}
      {pulse && (
        <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
      )}
    </span>
  );
}

// 9. Card with Hover Actions
export function ActionCard({
  children,
  actions,
  onHover,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  onHover?: (hovering: boolean) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="premium-card group relative overflow-hidden"
      onMouseEnter={() => {
        setHovered(true);
        onHover?.(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHover?.(false);
      }}
    >
      {children}
      {actions && (
        <div
          className={`absolute top-4 left-4 flex gap-2 transition-all duration-300 ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

// 10. Gradient Text Component
export function GradientText({
  children,
  className = '',
  gradient = 'primary',
}: {
  children: React.ReactNode;
  className?: string;
  gradient?: 'primary' | 'emerald' | 'cyan' | 'amber';
}) {
  const gradientClasses = {
    primary: 'text-gradient-primary',
    emerald: 'bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent',
    cyan: 'bg-gradient-to-r from-info to-info/80 bg-clip-text text-transparent',
    amber: 'bg-gradient-to-r from-warning to-warning/80 bg-clip-text text-transparent',
  };

  return (
    <span className={`${gradientClasses[gradient]} ${className}`}>
      {children}
    </span>
  );
}

// Example Usage Component
export function DesignImprovementsDemo() {
  const [inputValue, setInputValue] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">דוגמאות שיפורי עיצוב</h2>
        
        {/* Floating Label Input */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Floating Label Input</h3>
          <FloatingLabelInput
            label="שם מלא"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>

        {/* Animated Stat Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Animated Stat Cards</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatedStatCard
              value={125}
              label="סה&quot;כ מתאמנים"
              icon={Users}
              trend={12}
              color="emerald"
            />
            <AnimatedStatCard
              value={89}
              label="יעדים הושגו"
              icon={Target}
              trend={5}
              color="cyan"
            />
            <AnimatedStatCard
              value={42}
              label="תוכניות פעילות"
              icon={Award}
              trend={-3}
              color="amber"
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Animated Progress Bar</h3>
          <AnimatedProgressBar value={75} max={100} label="התקדמות חודשית" color="emerald" />
        </div>

        {/* Enhanced Button */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Enhanced Button</h3>
          <div className="flex gap-4">
            <EnhancedButton icon={Check}>שמור</EnhancedButton>
            <EnhancedButton loading>שומר...</EnhancedButton>
          </div>
        </div>

        {/* Empty State */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Empty State</h3>
          <div className="premium-card-static">
            <EmptyState
              icon={Users}
              title="אין מתאמנים"
              description="הוסף מתאמן ראשון כדי להתחיל"
              action={() => alert('הוספת מתאמן')}
              actionLabel="הוסף מתאמן"
            />
          </div>
        </div>

        {/* Gradient Text */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Gradient Text</h3>
          <GradientText className="text-4xl font-bold">כותרת עם Gradient</GradientText>
        </div>

        {/* Success Celebration */}
        {showSuccess && (
          <SuccessCelebration message="הפעולה בוצעה בהצלחה!" />
        )}
        <button onClick={() => setShowSuccess(!showSuccess)} className="btn-primary">
          הצג חגיגה
        </button>
      </div>
    </div>
  );
}
