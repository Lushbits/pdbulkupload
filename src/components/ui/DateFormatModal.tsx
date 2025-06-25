import React from 'react';
import { Button } from './Button';
import { Card } from './Card';

interface DateFormatModalProps {
  isOpen: boolean;
  onClose: (selectedFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY') => void;
  samples: string[];
}

/**
 * Modal for selecting date format when ambiguous
 * Shows sample dates to help user decide between DD/MM/YYYY and MM/DD/YYYY
 */
export const DateFormatModal: React.FC<DateFormatModalProps> = ({
  isOpen,
  onClose,
  samples,
}) => {
  if (!isOpen) return null;

  const handleFormatSelection = (format: 'DD/MM/YYYY' | 'MM/DD/YYYY') => {
    onClose(format);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📅 Date Format Selection Required
          </h2>
          
          <p className="text-gray-600 mb-6">
            Your Excel file contains dates, but we cannot automatically determine 
            whether they are in <strong>DD/MM/YYYY</strong> or <strong>MM/DD/YYYY</strong> format.
          </p>

          {samples.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Sample dates from your file:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono">
                {samples.slice(0, 5).map((sample, index) => (
                  <div key={index} className="text-gray-700">
                    {sample}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
              <h3 className="font-medium text-gray-900 mb-2">
                DD/MM/YYYY Format
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                European/International format<br />
                Day comes first, then month
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>25/12/2023 → December 25, 2023</div>
                <div>15/03/2024 → March 15, 2024</div>
              </div>
              <Button
                onClick={() => handleFormatSelection('DD/MM/YYYY')}
                className="w-full mt-3"
                variant="outline"
              >
                Select DD/MM/YYYY
              </Button>
            </div>

            <div className="border rounded-lg p-4 hover:bg-blue-50 transition-colors">
              <h3 className="font-medium text-gray-900 mb-2">
                MM/DD/YYYY Format
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                US format<br />
                Month comes first, then day
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>12/25/2023 → December 25, 2023</div>
                <div>03/15/2024 → March 15, 2024</div>
              </div>
              <Button
                onClick={() => handleFormatSelection('MM/DD/YYYY')}
                className="w-full mt-3"
                variant="outline"
              >
                Select MM/DD/YYYY
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-4">
            💡 <strong>Tip:</strong> Look at your sample dates above. If you see dates like "25/12/2023" 
            (where the first number is greater than 12), those are definitely DD/MM/YYYY format.
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => onClose()}
              variant="ghost"
              className="text-gray-500"
            >
              Cancel Upload
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}; 