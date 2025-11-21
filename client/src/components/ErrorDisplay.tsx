import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

export interface ErrorDisplayProps {
  /**
   * The error to display. Can be an Error object, string, or unknown type.
   */
  error: Error | string | unknown;
  
  /**
   * User-friendly error message to display. If not provided, a default message is used.
   */
  message?: string;
  
  /**
   * Title for the error display. Defaults to "Something went wrong".
   */
  title?: string;
  
  /**
   * Whether to show a retry button. Defaults to false.
   */
  showRetry?: boolean;
  
  /**
   * Callback function when retry button is clicked.
   */
  onRetry?: () => void;
  
  /**
   * Additional CSS classes for the container.
   */
  className?: string;
  
  /**
   * Size variant for the error display.
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Whether to show error details in development mode.
   */
  showDetails?: boolean;
}

/**
 * Standardized error display component for consistent error UI across the application.
 * 
 * Features:
 * - Consistent styling and layout
 * - User-friendly error messages
 * - Optional retry functionality
 * - Development-only error details
 * - Accessible error presentation
 * 
 * @example
 * ```tsx
 * {isError && (
 *   <ErrorDisplay 
 *     error={error} 
 *     message="Failed to load bookshops"
 *     showRetry
 *     onRetry={() => refetch()}
 *   />
 * )}
 * ```
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  message,
  title = "Something went wrong",
  showRetry = false,
  onRetry,
  className = "",
  size = 'md',
  showDetails = true,
}) => {
  // Extract error message
  const errorMessage = React.useMemo(() => {
    if (message) return message;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred. Please try again later.';
  }, [error, message]);

  // Extract error details for development
  const errorDetails = React.useMemo(() => {
    if (!showDetails || process.env.NODE_ENV !== 'development') return null;
    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
      };
    }
    return { error: String(error) };
  }, [error, showDetails]);

  // Size-based styling
  const sizeClasses = {
    sm: 'py-4 px-4',
    md: 'py-8 md:py-10 px-4',
    lg: 'py-12 md:py-16 px-6',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl',
  };

  const handleRetry = () => {
    if (onRetry) {
      logger.info('User clicked retry button', { errorMessage });
      onRetry();
    } else {
      // Default: reload the page
      window.location.reload();
    }
  };

  return (
    <div className={`text-center ${sizeClasses[size]} ${className}`}>
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold mb-2">
          {title}
        </AlertTitle>
        <AlertDescription className={textSizeClasses[size]}>
          <p className="mb-4">{errorMessage}</p>
          
          {/* Development error details */}
          {errorDetails && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 mb-2 hover:text-gray-700">
                Error details (development only)
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-40 mt-2">
                {errorDetails.stack || errorDetails.message || JSON.stringify(errorDetails, null, 2)}
              </pre>
            </details>
          )}
          
          {/* Retry button */}
          {showRetry && (
            <div className="mt-6">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="bg-white hover:bg-gray-50 border-red-300 text-red-700 hover:text-red-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
};

/**
 * Simplified error display for inline use (e.g., in forms, small sections)
 */
export const InlineError: React.FC<{
  error: Error | string | unknown;
  message?: string;
  className?: string;
}> = ({ error, message, className = "" }) => {
  const errorMessage = React.useMemo(() => {
    if (message) return message;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An error occurred';
  }, [error, message]);

  return (
    <div className={`text-sm text-red-600 ${className}`} role="alert">
      <AlertCircle className="h-4 w-4 inline mr-1" />
      {errorMessage}
    </div>
  );
};

export default ErrorDisplay;

