import React from 'react';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingMessage } from '../ui/LoadingMessage';

export const PageLayout = ({
  children,
  theme = 'dark',
  title,
  subtitle,
  controls,
  error,
  onErrorDismiss,
  loading,
  loadingMessage,
  stats,
}) => {
  const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-slate-50';
  const textColor = theme === 'dark' ? 'text-white' : 'text-slate-700';

  return (
    <div className={`flex flex-col h-full ${bgColor}`} style={{ height: '100%' }}>
      {/* Header with controls */}
      {controls && <div className="flex-shrink-0 p-2">{controls}</div>}

      {/* Title and subtitle */}
      {(title || subtitle) && (
        <div className="flex-shrink-0 px-2 mb-1">
          {title && <h1 className={`text-lg font-bold ${textColor}`}>{title}</h1>}
          {subtitle && <div className="flex flex-wrap gap-2 mt-1 text-xs">{subtitle}</div>}
        </div>
      )}

      {/* Stats component */}
      {stats && <div className="flex-shrink-0 px-2 mb-1">{stats}</div>}

      {/* Error message */}
      <ErrorMessage error={error} onDismiss={onErrorDismiss} />

      {/* Loading message */}
      {loading && <LoadingMessage message={loadingMessage || 'Loading...'} />}

      {/* Main content with proper sizing */}
      <div className="flex-1 min-h-0" style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};
