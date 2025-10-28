'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/spinner';
import { CheckCircle2 } from 'lucide-react';
import { useSession } from '@/lib/better-auth/client';

interface CLIAuthContentProps {
  state?: string;
  port?: string;
}

export function CLIAuthContent({ state, port }: CLIAuthContentProps) {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>(
    'pending',
  );
  const [error, setError] = useState<string>();
  const { data: session } = useSession();

  useEffect(() => {
    const authenticate = async () => {
      try {
        console.log('CLIAuthContent - Starting authentication with:', {
          state,
          port,
        });
        if (!state || !port) {
          console.error('CLIAuthContent - Missing parameters:', {
            state,
            port,
          });
          throw new Error('Missing required parameters');
        }

        // Generate CLI token
        console.log('CLIAuthContent - Generating token...');
        const response = await fetch('/api/cli/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state,
            deviceName: getDeviceName(),
          }),
        });

        if (!response.ok) {
          console.error(
            'CLIAuthContent - Failed to generate token:',
            response.status,
          );
          throw new Error('Failed to generate token');
        }

        const { token } = await response.json();
        console.log('CLIAuthContent - Token generated, sending to CLI...');

        // Send token to CLI's local server
        const cliResponse = await fetch(`http://localhost:${port}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, state }),
        });

        if (!cliResponse.ok) {
          console.error(
            'CLIAuthContent - Failed to send token to CLI:',
            cliResponse.status,
          );
          throw new Error('Failed to send token to CLI');
        }

        console.log('CLIAuthContent - Successfully sent token to CLI');
        setStatus('success');

        // Auto-close window after success
        setTimeout(() => {
          window.close();
        }, 3000);
      } catch (err) {
        console.error('CLIAuthContent - Authentication failed:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    authenticate();
  }, [state, port]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="size-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-600">
            Authentication Failed
          </h1>
          <p className="text-gray-600 mt-2">{error}</p>
          <p className="text-gray-600 mt-4">
            Please close this window and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      {status === 'pending' ? (
        <div className="text-center">
          <Spinner className="size-12 mx-auto" />
          <h1 className="text-2xl font-bold mt-4">Authenticating CLI...</h1>
          <p className="text-gray-600 mt-2">This will only take a moment.</p>
        </div>
      ) : (
        <div className="text-center">
          <CheckCircle2 className="size-12 mx-auto text-green-500" />
          <h1 className="text-2xl font-bold mt-4">
            CLI Successfully Authenticated
          </h1>
          <p className="text-gray-600 mt-2">
            You can close this window and return to your terminal.
          </p>
          <p className="text-gray-500 mt-4 text-sm">
            This window will close automatically in a few seconds.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to get device name
function getDeviceName(): string {
  const platform = navigator.platform;
  const userAgent = navigator.userAgent;

  let deviceType = 'Device';

  if (platform.startsWith('Mac')) {
    deviceType = 'MacBook';
    if (userAgent.includes('iPad')) deviceType = 'iPad';
    if (userAgent.includes('iPhone')) deviceType = 'iPhone';
  } else if (platform.startsWith('Win')) {
    deviceType = 'Windows PC';
  } else if (platform.startsWith('Linux')) {
    deviceType = 'Linux';
  }

  return `CLI on ${deviceType}`;
}
