'use client';

import { createContext, useCallback, useContext, ReactNode } from 'react';
import { toast } from 'sonner';
import type { NotificationType } from '@/components/modals/StackedNotifications';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  autoClose?: boolean;
  autoCloseTime?: number;
  customIcon?: React.ReactNode;
  createdAt: number;
  closing?: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  showNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      autoClose?: boolean;
      autoCloseTime?: number;
      customIcon?: React.ReactNode;
    }
  ) => void;
  showSuccess: (title: string, message: string, customIcon?: React.ReactNode) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  removeNotification: (id: string) => void;
  startCloseNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Adapter Pattern: bridges legacy useGlobalNotification() callers directly to Sonner toasts
 * so every notification across the app shares one consistent, non-blocking visual style.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const showNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      options?: {
        autoClose?: boolean;
        autoCloseTime?: number;
        customIcon?: React.ReactNode;
      }
    ) => {
      const toastOptions = {
        description: message || undefined,
        duration: options?.autoClose === false ? Infinity : options?.autoCloseTime ?? 4000,
      };

      switch (type) {
        case 'success':
          toast.success(title, toastOptions);
          break;
        case 'error':
          toast.error(title, toastOptions);
          break;
        case 'warning':
          toast.warning(title, toastOptions);
          break;
        default:
          toast.info(title, toastOptions);
          break;
      }
    },
    []
  );

  const showSuccess = useCallback(
    (title: string, message: string, customIcon?: React.ReactNode) => {
      showNotification('success', title, message, { customIcon });
    },
    [showNotification]
  );

  const showError = useCallback(
    (title: string, message: string) => {
      showNotification('error', title, message);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (title: string, message: string) => {
      showNotification('warning', title, message);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (title: string, message: string) => {
      showNotification('info', title, message);
    },
    [showNotification]
  );

  const removeNotification = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  const startCloseNotification = useCallback((id: string) => {
    toast.dismiss(id);
  }, []);

  const clearAllNotifications = useCallback(() => {
    toast.dismiss();
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications: [],
        showNotification,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeNotification,
        startCloseNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useGlobalNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useGlobalNotification must be used within a NotificationProvider');
  }
  return context;
}
