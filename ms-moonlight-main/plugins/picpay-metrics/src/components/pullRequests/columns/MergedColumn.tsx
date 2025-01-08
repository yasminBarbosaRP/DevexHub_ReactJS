import React from 'react';

export const MergedColumn: React.FC<{ mergedAt: string | null; mergedRelativeTime: string | null }> = ({ mergedAt, mergedRelativeTime }) => (
  <span title={mergedAt || ''}>
    {mergedRelativeTime}
  </span>
);
