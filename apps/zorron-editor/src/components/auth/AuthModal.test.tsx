import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { useAuthStore } from '@/stores/authStore';

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AuthModal isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders login form by default and allows switching to register tab', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('auth-tab-login')).toBeInTheDocument();
    expect(screen.getByTestId('auth-tab-register')).toBeInTheDocument();
    expect(screen.getByTestId('auth-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('auth-password-input')).toBeInTheDocument();
    expect(screen.queryByTestId('auth-nickname-input')).not.toBeInTheDocument();

    // Switch to register
    fireEvent.click(screen.getByTestId('auth-tab-register'));
    expect(screen.getByTestId('auth-nickname-input')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('auth-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
