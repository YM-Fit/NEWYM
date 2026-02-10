import { useState, useCallback } from 'react';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ConfirmDialogState {
  isOpen: boolean;
  config: ConfirmConfig | null;
  resolve: ((value: boolean) => void) | null;
}

/**
 * Hook for programmatic confirmation dialogs - replaces window.confirm
 * Returns a promise that resolves to true (confirmed) or false (cancelled)
 *
 * @example
 * const { confirm, ConfirmDialog } = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({
 *     title: 'מחיקת מתאמן',
 *     message: 'האם אתה בטוח? הפעולה אינה ניתנת לביטול!',
 *     confirmText: 'מחק',
 *   });
 *   if (ok) await deleteTrainee(id);
 * };
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    config: null,
    resolve: null,
  });

  const confirm = useCallback((config: ConfirmConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        config: {
          title: config.title,
          message: config.message,
          confirmText: config.confirmText ?? 'אישור',
          cancelText: config.cancelText ?? 'ביטול',
          variant: config.variant ?? 'danger',
        },
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, config: null, resolve: null });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, config: null, resolve: null });
  }, [state.resolve]);

  const ConfirmDialogComponent = state.config ? (
    <ConfirmationDialog
      isOpen={state.isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={state.config.title}
      message={state.config.message}
      confirmText={state.config.confirmText}
      cancelText={state.config.cancelText}
      variant={state.config.variant}
    />
  ) : null;

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
    isOpen: state.isOpen,
  };
}
