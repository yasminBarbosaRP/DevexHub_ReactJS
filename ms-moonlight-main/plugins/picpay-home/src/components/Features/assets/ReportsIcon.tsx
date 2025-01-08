import React from 'react';

export const ReportsIcon = ({ fill }: { fill: string }) => {
  return (
    <svg
      width="19"
      height="18"
      viewBox="0 0 19 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.0933 0H2.09326C0.993262 0 0.0932617 0.9 0.0932617 2V16C0.0932617 17.1 0.993262 18 2.09326 18H16.0933C17.1933 18 18.0933 17.1 18.0933 16V2C18.0933 0.9 17.1933 0 16.0933 0ZM6.09326 14H4.09326V7H6.09326V14ZM10.0933 14H8.09326V4H10.0933V14ZM14.0933 14H12.0933V10H14.0933V14Z"
        fill={fill}
      />
    </svg>
  );
};
