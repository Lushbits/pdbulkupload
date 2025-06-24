/**
 * Documentation Layout Component
 * Layout for documentation pages (roadmap, FAQ, support, etc.)
 * Matches the main app styling with sparkling background and consistent header
 */

import React from 'react';
import { Link } from 'wouter';
import { BetaTag, PrivacyModal, CookieModal, TermsOfServiceModal, VersionModal, getCurrentVersion } from '../ui';
import { APP_METADATA } from '../../constants';

interface DocumentationLayoutProps {
  children: React.ReactNode;
}

export const DocumentationLayout: React.FC<DocumentationLayoutProps> = ({ children }) => {
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = React.useState(false);
  const [isCookieModalOpen, setIsCookieModalOpen] = React.useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = React.useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = React.useState(false);

  return (
    <div className="min-h-screen sparkling-background flex justify-center py-8 items-start">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative" style={{zIndex: 10}}>
        
        {/* App Header - Same as main app */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 dynamic-header flex items-center justify-center flex-wrap">
            <span>{APP_METADATA.NAME}</span>
            <BetaTag />
          </h1>
          <p className="text-xl text-gray-600">
            {APP_METADATA.DESCRIPTION}
          </p>
        </div>

        {/* Main Content in White Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          {/* Back to Main App link in top left corner */}
          <div className="p-6 pb-0">
            <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm mb-6">
              ← Back to Main App
            </Link>
          </div>
          <div className="px-6 pb-6">
            {children}
          </div>
        </div>

        {/* Privacy Notice Footer - Same as main app */}
        <div className="mt-12 pt-8">
          <div className="text-center">
            <p className="text-sm text-gray-800 mb-2">
              Your employee data is processed entirely on your device and sent directly to Planday - we never store, access, or process your data on our servers. <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Read more
            </button>.
            </p>
            
            {/* Version Display */}
            <div className="mt-4">
              <div className="text-sm text-gray-600">
                <button
                  onClick={() => setIsVersionModalOpen(true)}
                  className="hover:text-gray-800 transition-colors underline"
                >
                  Version {getCurrentVersion()}
                </button>
                <span className="mx-2">-</span>
                <button
                  onClick={() => setIsCookieModalOpen(true)}
                  className="hover:text-gray-800 transition-colors underline"
                >
                  Cookie Policy
                </button>
                <span className="mx-2">-</span>
                <button
                  onClick={() => setIsTermsModalOpen(true)}
                  className="hover:text-gray-800 transition-colors underline"
                >
                  Terms of Service
                </button>
                <span className="mx-2">-</span>
                <span>Made with <span className="heartbeat">❤️</span> by the </span>
                <a 
                  href="https://www.planday.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-gray-800 transition-colors underline"
                >
                  Planday
                </a>
                <span> Community</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Modal */}
        <PrivacyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />

        {/* Cookie Modal */}
        <CookieModal
          isOpen={isCookieModalOpen}
          onClose={() => setIsCookieModalOpen(false)}
        />

        {/* Terms of Service Modal */}
        <TermsOfServiceModal
          isOpen={isTermsModalOpen}
          onClose={() => setIsTermsModalOpen(false)}
        />

        {/* Version Modal */}
        <VersionModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
        />

      </div>
    </div>
  );
}; 