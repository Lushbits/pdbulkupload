import React from 'react';
import { Button } from './Button';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Privacy Statement</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="prose prose-sm max-w-none text-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Planday Bulk Employee Uploader</h2>
              <p className="text-sm text-gray-600 mb-6"><strong>Last updated:</strong> June 22, 2025</p>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Independent Third-Party Application</h3>
              <p className="text-sm mb-4">
                <strong>This application is not created, owned, or operated by Planday or any Planday-affiliated company.</strong> We are an independent third-party tool that integrates with Planday's public API to provide bulk employee upload functionality. While we use Planday's official API, we operate independently and are solely responsible for this application's privacy practices.
              </p>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Our Commitment to Your Privacy</h3>
              <p className="text-sm mb-4">
                We are committed to protecting your privacy and ensuring the security of your employee data. 
                This privacy statement explains how our Planday Bulk Employee Uploader handles your information.
              </p>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Client-Side Processing Architecture</h3>
              <p className="text-sm mb-2">
                <strong>Your data is processed locally and never stored on our servers.</strong> Our application is built with a privacy-by-design architecture that ensures:
              </p>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li><strong>Local processing only</strong>: All file parsing, data validation, column mapping, and formatting occurs entirely within your web browser</li>
                <li><strong>No server-side storage</strong>: We do not store, cache, or retain any of your employee data on our servers or any third-party systems</li>
                <li><strong>Direct API integration</strong>: Your processed data flows directly from your browser to Planday's secure servers via their official API</li>
                <li><strong>Temporary memory only</strong>: All data processing happens in your browser's temporary memory and is automatically cleared when you close the application</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Data Processing Location</h3>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li><strong>Local processing</strong>: All data processing occurs locally on your device, wherever you are located</li>
                <li><strong>No intermediate servers</strong>: Your employee data is never transmitted to our servers or processed outside your browser</li>
                <li><strong>Direct to Planday</strong>: Data is sent directly from your browser to Planday's infrastructure</li>
                <li><strong>Planday's jurisdiction</strong>: Data sent to Planday follows their established data processing and storage policies as outlined in their privacy policy</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">What We Process vs. What We Don't Store</h3>
              <p className="text-sm mb-2">
                <strong>We process your data locally to provide the service, but never store it:</strong>
              </p>
              
              <p className="text-sm font-medium mb-1"><strong>What we process in your browser:</strong></p>
              <ul className="text-sm mb-3 ml-4 list-disc space-y-1">
                <li>Excel file parsing and data extraction</li>
                <li>Employee data validation and formatting</li>
                <li>Column mapping and department verification</li>
                <li>Data cleaning (phone numbers, dates, email formats)</li>
              </ul>

              <p className="text-sm font-medium mb-1"><strong>What we don't store or retain:</strong></p>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li>Employee personal information after processing</li>
                <li>Excel files or their contents</li>
                <li>Authentication tokens beyond temporary browser session storage</li>
                <li>Usage analytics or detailed tracking data</li>
                <li>IP addresses or browser fingerprints</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Authentication Security</h3>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li><strong>Token security</strong>: Your Planday refresh tokens are stored only in your browser's memory during the session</li>
                <li><strong>Automatic cleanup</strong>: All authentication data is automatically cleared when you close your browser</li>
                <li><strong>No persistent storage</strong>: We do not save or remember your credentials between sessions</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Third-Party Services</h3>
              <p className="text-sm mb-2">Our application communicates exclusively with:</p>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li><strong>Planday API</strong>: For employee creation and department validation (covered by Planday's privacy policy - we are not affiliated with Planday)</li>
                <li><strong>Netlify hosting</strong>: Static application hosting with no data processing capabilities</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Your Rights and Control</h3>
              <p className="text-sm mb-2">You maintain complete control over your data:</p>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li><strong>Data sovereignty</strong>: Your data remains under your control at all times</li>
                <li><strong>Immediate deletion</strong>: Simply closing your browser removes all processed data from memory</li>
                <li><strong>Transparent processing</strong>: You can inspect all data before it's sent to Planday</li>
                <li><strong>Revoke access</strong>: You can revoke API access through your Planday portal at any time</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Technical Safeguards</h3>
              <ul className="text-sm mb-4 ml-4 list-disc space-y-1">
                <li><strong>HTTPS encryption</strong>: All communications are encrypted in transit</li>
                <li><strong>Client-side validation</strong>: Data validation occurs locally in your browser before any transmission</li>
                <li><strong>Atomic operations</strong>: Employee data is processed in secure, all-or-nothing batches</li>
                <li><strong>No server-side logging</strong>: We do not log, store, or monitor your data processing activities on our servers</li>
                <li><strong>Automatic cleanup</strong>: All processed data is cleared from browser memory when you close the application</li>
              </ul>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Contact Information</h3>
              <p className="text-sm mb-4">
                If you have questions about this privacy statement or our data handling practices, please contact us through our official support channels.
              </p>

              <h3 className="text-base font-semibold text-gray-900 mb-2">Changes to This Statement</h3>
              <p className="text-sm mb-4">
                We will notify users of any material changes to this privacy statement. The current version is always available within the application.
              </p>

              <div className="border-t border-gray-200 pt-4 mt-6">
                <p className="text-sm font-medium text-gray-900">
                  <strong>Summary:</strong> Your employee data is processed locally in your browser and sent directly to Planday. 
                  We never store your data on our servers - all processing happens on your device and is automatically cleared when you close the application.
                </p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200">
            <Button onClick={onClose} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}; 