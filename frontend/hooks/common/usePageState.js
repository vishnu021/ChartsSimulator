import { useState, useCallback } from 'react';

export const usePageState = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setData(null);
  }, []);

  const handleLoadSuccess = useCallback(newData => {
    setData(newData);
    setIsLoading(false);
  }, []);

  const handleLoadError = useCallback(errorMessage => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetState = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    handleLoadStart,
    handleLoadSuccess,
    handleLoadError,
    clearError,
    resetState,
    setData,
  };
};
