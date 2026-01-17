/**
 * Render with Providers
 * Custom render function with all necessary context providers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { CrmProvider } from '../../contexts/CrmContext';

/**
 * All providers wrapper for testing
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CrmProvider>
          {children}
        </CrmProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
