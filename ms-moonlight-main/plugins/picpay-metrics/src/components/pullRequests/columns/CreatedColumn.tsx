import React from 'react';

export const CreatedColumn: React.FC<{ createdAt: string; createdRelativeTime: string }> = ({ createdAt, createdRelativeTime }) => (
  <span title={createdAt}>{createdRelativeTime}</span>
);
