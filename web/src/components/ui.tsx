import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const TONES: Record<string, string> = {
  neutral: 'bg-ink/[0.06] text-ink/70 ring-ink/10',
  info: 'bg-studio-soft text-studio ring-studio/20',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  accent: 'bg-[#F6EFE1] text-[#8A6524] ring-[#E4D2AE]',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES | string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  map,
  value,
}: {
  map: Record<string, { label: string; tone: string }>;
  value?: string | null;
}) {
  if (!value) return <span className="text-muted">—</span>;
  const item = map[value];
  return (
    <Badge tone={item?.tone ?? 'neutral'}>{item?.label ?? value}</Badge>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cx('h-4 w-4 animate-spin text-muted', className)}
      aria-hidden
    />
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brass';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-white border border-ink hover:bg-ink-soft hover:border-ink-soft',
  secondary:
    'bg-surface text-ink border border-line hover:border-ink/35 hover:bg-ink/[0.02]',
  ghost: 'bg-transparent text-muted border border-transparent hover:text-ink hover:bg-ink/[0.05]',
  danger: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  brass: 'bg-brass text-white border border-brass hover:bg-[#9d7639]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
    >
      {loading ? (
        <Spinner className="text-current" />
      ) : Icon ? (
        <Icon className="h-4 w-4" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label className={cx('block', className)} htmlFor={htmlFor}>
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink/80">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-[11.5px] text-red-600">
          <AlertCircle className="h-3 w-3" /> {error}
        </span>
      )}
    </label>
  );
}

const CONTROL =
  'w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/60 transition-colors outline-none focus:border-studio focus:ring-2 focus:ring-studio/15 disabled:bg-canvas disabled:text-muted';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(CONTROL, 'h-10', className)} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...rest} className={cx(CONTROL, 'min-h-[84px] py-2 leading-relaxed', className)} />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={cx(CONTROL, 'h-10 appearance-none pr-9', className)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cx(CONTROL, 'h-10 pl-9')}
      />
    </div>
  );
}

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: any;
}) {
  return <As className={cx('mmv-surface', className)}>{children}</As>;
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-ink/[0.05] text-ink/70">
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div>
          <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mmv-label mb-1.5">{eyebrow}</p>}
        <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[26px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}) {
  const tile: Record<string, string> = {
    neutral: 'bg-ink/[0.05] text-ink/70',
    info: 'bg-studio-soft text-studio',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-600',
    success: 'bg-emerald-50 text-emerald-700',
  };
  const Component: any = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={cx(
        'mmv-surface flex items-start gap-3 p-4 text-left transition-shadow',
        onClick && 'hover:shadow-lift',
      )}
    >
      {Icon && (
        <span
          className={cx(
            'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
            tile[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <span className="min-w-0">
        <span className="mmv-label block truncate">{label}</span>
        <span className="mt-1 block text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {value}
        </span>
        {hint && <span className="mt-1.5 block text-[11.5px] text-muted">{hint}</span>}
      </span>
    </Component>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === 'xl' ? 'max-w-4xl' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'mmv-fade-in relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-lift sm:rounded-2xl',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            {description && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-1 grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mmv-scroll overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
      )}
    >
      {Icon && (
        <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-ink/[0.05] text-muted">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function FilterPills<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mmv-scroll flex gap-1.5 overflow-x-auto pb-1">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cx(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors',
              active
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-surface text-muted hover:border-ink/30 hover:text-ink',
            )}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cx(
                  'rounded-full px-1.5 text-[10.5px]',
                  active ? 'bg-white/15 text-white' : 'bg-ink/[0.06] text-muted',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const sizes = {
    sm: 'h-7 w-7 text-[10.5px]',
    md: 'h-9 w-9 text-[12px]',
    lg: 'h-12 w-12 text-sm',
  };
  return (
    <span
      className={cx(
        'grid shrink-0 place-items-center rounded-full bg-ink text-white font-semibold tracking-wide',
        sizes[size],
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function LoadingBlock({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted">
      <Spinner />
      {label}
    </div>
  );
}
