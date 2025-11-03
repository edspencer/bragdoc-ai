import { renderHook, act } from '@testing-library/react';
import { useDemoHelpDialog } from '../use-demo-help-dialog';
import { isDemoHelpEnabled } from '@/lib/demo-mode-utils';

// Mock the demo mode utils
jest.mock('@/lib/demo-mode-utils', () => ({
  isDemoHelpEnabled: jest.fn(),
}));

describe('useDemoHelpDialog', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with dialog closed', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', false));

    expect(result.current.isOpen).toBe(false);
  });

  it('should open dialog on first view when demo mode enabled', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', true));

    expect(result.current.isOpen).toBe(true);
  });

  it('should not open dialog if feature is disabled', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', true));

    expect(result.current.isOpen).toBe(false);
  });

  it('should not open dialog if user is not in demo mode', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', false));

    expect(result.current.isOpen).toBe(false);
  });

  it('should save to localStorage when dialog closes', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', true));

    expect(result.current.isOpen).toBe(true);

    // Close the dialog
    act(() => {
      result.current.setIsOpen(false);
    });

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem('demo-help-seen-dashboard')).toBe('true');
  });

  it('should not open dialog if already seen (localStorage set)', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(true);
    localStorage.setItem('demo-help-seen-dashboard', 'true');

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', true));

    expect(result.current.isOpen).toBe(false);
  });

  it('should track different pages independently', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(true);
    localStorage.setItem('demo-help-seen-dashboard', 'true');

    const { result: reportResult } = renderHook(() =>
      useDemoHelpDialog('reports', true),
    );

    // Reports page should still open even though dashboard was seen
    expect(reportResult.current.isOpen).toBe(true);
  });

  it('should allow dialog to reopen via setIsOpen regardless of localStorage', () => {
    (isDemoHelpEnabled as jest.Mock).mockReturnValue(true);
    localStorage.setItem('demo-help-seen-dashboard', 'true');

    const { result } = renderHook(() => useDemoHelpDialog('dashboard', true));

    expect(result.current.isOpen).toBe(false);

    // User clicks help button to reopen dialog
    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);
  });
});
