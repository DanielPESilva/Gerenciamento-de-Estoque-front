'use client';

type SuccessModalVariant = 'success' | 'error';

interface SuccessModalProps {
  open: boolean;
  title?: string;
  message: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  onClose: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryDisabled?: boolean;
  variant?: SuccessModalVariant;
}

export function SuccessModal({
  open,
  message,
  primaryLabel = 'Ok',
  onPrimaryAction,
  onClose,
  primaryDisabled = false,
  secondaryLabel,
  onSecondaryAction,
  secondaryDisabled = false,
  variant = 'success',
  title
}: SuccessModalProps) {
  if (!open) {
    return null;
  }

  const isError = variant === 'error';
  const resolvedTitle =
    title ?? (isError ? 'Algo deu errado' : 'Tudo certo!');

  const containerClass = isError
    ? 'w-full max-w-md rounded-2xl border-2 border-red-300 bg-white p-8 text-center shadow-[0_20px_60px_-20px_rgba(248,113,113,0.6)]'
    : 'w-full max-w-md rounded-2xl border-2 border-emerald-300 bg-white p-8 text-center shadow-[0_20px_60px_-20px_rgba(16,185,129,0.6)]';

  const iconWrapperClass = isError
    ? 'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100'
    : 'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100';

  const primaryButtonClass = isError
    ? 'inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
    : 'inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-6 py-3 text-base font-medium text-white shadow-sm transition hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const secondaryButtonClass = isError
    ? 'inline-flex w-full items-center justify-center rounded-lg border border-red-300 px-6 py-3 text-base font-medium text-red-600 shadow-sm transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'
    : 'inline-flex w-full items-center justify-center rounded-lg border border-emerald-300 px-6 py-3 text-base font-medium text-emerald-600 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const handlePrimaryClick = () => {
    if (primaryDisabled) {
      return;
    }
    if (onPrimaryAction) {
      onPrimaryAction();
    }
    onClose();
  };

  const handleSecondaryClick = () => {
    if (secondaryDisabled) {
      return;
    }
    if (onSecondaryAction) {
      onSecondaryAction();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={containerClass}>
        <div className={iconWrapperClass}>
          {isError ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-red-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0V7zm.75 6a1 1 0 100 2 1 1 0 000-2z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-emerald-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <h2
          className={`mb-2 text-2xl font-semibold ${
            isError ? 'text-red-600' : 'text-emerald-600'
          }`}
        >
          {resolvedTitle}
        </h2>
        <p className="mb-6 text-base text-gray-600">{message}</p>
        <div className="flex flex-col gap-3">
          {secondaryLabel && onSecondaryAction && (
            <button
              onClick={handleSecondaryClick}
              disabled={secondaryDisabled}
              className={secondaryButtonClass}
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={handlePrimaryClick}
            disabled={primaryDisabled}
            className={primaryButtonClass}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

