import React from 'react';

export const TechDocsIcon = ({ fill }: { fill: string }) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4.09326 6H2.09326V20C2.09326 21.1 2.99326 22 4.09326 22H18.0933V20H4.09326V6ZM20.0933 2H8.09326C6.99326 2 6.09326 2.9 6.09326 4V16C6.09326 17.1 6.99326 18 8.09326 18H20.0933C21.1933 18 22.0933 17.1 22.0933 16V4C22.0933 2.9 21.1933 2 20.0933 2ZM19.0933 11H9.09326V9H19.0933V11ZM15.0933 15H9.09326V13H15.0933V15ZM19.0933 7H9.09326V5H19.0933V7Z"
        fill={fill}
      />
    </svg>
  );
};
