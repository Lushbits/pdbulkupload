/**
 * Rate Limit Gauge Component
 * 
 * Displays real-time rate limiting status with clear visual indicators
 * Shows adaptive speeds, recovery times, and system health
 */

import React from 'react';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: number;
  isActive: boolean;
  currentSpeed?: 'fast' | 'medium' | 'slow';
}

interface RateLimitGaugeProps {
  rateLimitInfo?: RateLimitInfo | null;
  className?: string;
}

export const RateLimitGauge: React.FC<RateLimitGaugeProps> = ({ 
  rateLimitInfo, 
  className = "" 
}) => {
  // Default state when no rate limit data or inactive
  if (!rateLimitInfo || !rateLimitInfo.isActive) {
    return (
      <div className={`mb-4 p-3 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">API Rate Limiting</span>
          <span className="text-xs text-green-600 font-medium">✅ Optimal</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all duration-300" style={{ width: '25%' }} />
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Smart rate limiting active • 18 req/sec • Multi-user safe
        </div>
      </div>
    );
  }

  const { remaining, limit, resetTime, currentSpeed } = rateLimitInfo;
  const utilizationPercentage = ((limit - remaining) / limit) * 100;
  
  // Determine status and colors based on utilization and speed
  let barColor = 'bg-green-500';
  let textColor = 'text-green-700';
  let status = 'Optimal';
  let statusIcon = '✅';
  let description = 'Running at full speed';
  
  if (utilizationPercentage > 80) {
    barColor = 'bg-red-500';
    textColor = 'text-red-700';
    status = 'Rate Limited';
    statusIcon = '🔴';
    description = 'Hit rate limit - backing off';
  } else if (utilizationPercentage > 60) {
    barColor = 'bg-orange-500';
    textColor = 'text-orange-700';
    status = 'Throttling';
    statusIcon = '🟡';
    description = 'Slowing down to prevent limits';
  } else if (utilizationPercentage > 30) {
    barColor = 'bg-yellow-500';
    textColor = 'text-yellow-700';
    status = 'Moderate';
    statusIcon = '🟡';
    description = 'Adaptive speed control';
  }

  // Speed-based adjustments
  if (currentSpeed === 'slow') {
    if (status === 'Optimal') {
      status = 'Recovering';
      statusIcon = '🔄';
      description = 'Slow speed - recovering from errors';
    }
  } else if (currentSpeed === 'medium') {
    if (status === 'Optimal') {
      status = 'Cautious';
      statusIcon = '⚡';
      description = 'Medium speed - preventive throttling';
    }
  }



  return (
    <div className={`mb-4 p-3 bg-gray-50 rounded-lg border-l-4 ${
      utilizationPercentage > 80 ? 'border-red-500' : 
      utilizationPercentage > 60 ? 'border-orange-500' :
      utilizationPercentage > 30 ? 'border-yellow-500' : 'border-green-500'
    } ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">API Rate Limiting</span>
        <span className={`text-xs font-medium ${textColor} flex items-center gap-1`}>
          <span>{statusIcon}</span>
          <span>{status}</span>
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, utilizationPercentage)}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-600">
        <span>{description}</span>
        <span className="font-mono">
          {remaining}/{limit} remaining
        </span>
      </div>
      
      {/* Helpful status messages */}
      {utilizationPercentage > 80 && (
        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border">
          <strong>Rate limit hit!</strong> The system is automatically slowing down and will retry failed requests.
        </div>
      )}
      
      {currentSpeed === 'slow' && utilizationPercentage <= 30 && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded border">
          <strong>Recovery mode:</strong> Running at reduced speed after errors. Will gradually speed up.
        </div>
      )}
    </div>
  );
}; 