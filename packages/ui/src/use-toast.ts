'use client';

import { useState, useCallback } from 'react';

export interface ToastData {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: ToastData[];
}

let toastCount = 0;

export function useToast() {
  const [state, setState] = useState<ToastState>({
    toasts: [],
  });

  const toast = useCallback(({ ...props }: Omit<ToastData, 'id'>) => {
    const id = (++toastCount).toString();
    
    const newToast: ToastData = {
      id,
      ...props,
    };

    setState((prevState) => ({
      ...prevState,
      toasts: [...prevState.toasts, newToast],
    }));

    return {
      id,
      dismiss: () => {
        setState((prevState) => ({
          ...prevState,
          toasts: prevState.toasts.filter((toast) => toast.id !== id),
        }));
      },
      update: (props: Partial<ToastData>) => {
        setState((prevState) => ({
          ...prevState,
          toasts: prevState.toasts.map((toast) =>
            toast.id === id ? { ...toast, ...props } : toast
          ),
        }));
      },
    };
  }, []);

  const dismiss = useCallback((toastId?: string) => {
    setState((prevState) => ({
      ...prevState,
      toasts: toastId
        ? prevState.toasts.filter((toast) => toast.id !== toastId)
        : [],
    }));
  }, []);

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  };
}