/**
 * Authentication Step Component
 * Handles Planday API authentication with refresh token
 * Features:
 * - Refresh token input with validation
 * - API connection testing
 * - Clear error handling and user feedback
 * - Automatic token management
 */

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import type { UsePlandayApiReturn } from '../../hooks/usePlandayApi';
import type { StepComponentProps } from '../../types/planday';

interface AuthenticationStepProps extends StepComponentProps {
  onAuthenticated?: () => void;
  plandayApi: UsePlandayApiReturn;
}

export const AuthenticationStep: React.FC<AuthenticationStepProps> = ({
  onNext,
  onAuthenticated,
  plandayApi,
}) => {
  const [refreshToken, setRefreshToken] = useState('');
  
  // Use the passed Planday API hook data (no longer calling hook directly)
  const { 
    isAuthenticated, 
    isAuthenticating, 
    authError, 
    departments, 
    employeeGroups, 
    authenticate,
    logout 
  } = plandayApi;



  /**
   * Handle authentication with Planday API
   */
  const handleAuthenticate = async () => {
    if (!refreshToken.trim()) {
      return;
    }

    try {
      const success = await authenticate(refreshToken.trim());
      
      if (success) {
        // Notify parent components
        if (onAuthenticated) {
          onAuthenticated();
        }
        
        // Automatically advance to next step after successful authentication
        onNext();
      }
      
    } catch (error) {
      console.error('❌ Authentication failed:', error);
    }
  };

  /**
   * Reset authentication state
   */
  const handleReset = () => {
    logout();
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">
          Connect to Planday
        </h2>
        <p className="text-gray-600">
          Enter your Planday refresh token to start the bulk upload process
        </p>
      </div>

      {/* Authentication Form and Instructions - Side by Side */}
      {isAuthenticated ? (
        /* Already Authenticated State */
        <Card>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Successfully Connected to Planday
              </h3>
              <p className="text-gray-600 mb-4">
                Found {departments.length} departments and {employeeGroups.length} employee groups
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={onNext}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                }
                iconPosition="right"
              >
                Continue to Upload
              </Button>
              <Button
                variant="secondary"
                onClick={handleReset}
                className="text-red-600 hover:bg-red-50"
              >
                Disconnect & Use Different Token
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Not Authenticated State - Side by Side Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Authentication Form */}
          <Card>
            <div className="space-y-4">
              <div>
                              <label htmlFor="refreshToken" className="block text-lg font-semibold text-gray-700 mb-2">
                Refresh Token
              </label>
                <Input
                  id="refreshToken"
                  type="password"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Enter your Planday refresh token"
                  disabled={isAuthenticating}
                  error={authError || undefined}
                  className="font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Get your token from Planday Settings → API Access
                </p>
              </div>

              {/* Error Display */}
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{authError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleAuthenticate}
                  disabled={isAuthenticating || !refreshToken.trim()}
                  loading={isAuthenticating}
                >
                  {isAuthenticating ? 'Connecting...' : 'Connect to Planday'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Instructions */}
          <Card variant="outline">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900">
                How to get your refresh token:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Log in to your Planday portal</li>
                <li>Go to Settings → API Access</li>
                <li>Click "Connect APP" and connect to app: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">a1cf1063-3590-4edd-b8bf-80b32481f77a</code> <button
                      onClick={() => navigator.clipboard.writeText('a1cf1063-3590-4edd-b8bf-80b32481f77a')}
                      className="inline-flex items-center justify-center w-4 h-4 ml-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Copy app ID to clipboard"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button></li>
                <li>Authorize the app when prompted</li>
                <li>Copy the "Token" value</li>
                <li>Paste it into the field on this page</li>
              </ol>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}; 