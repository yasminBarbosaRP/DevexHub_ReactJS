import React from 'react';

export const TemplatesIcon = ({ fill }: { fill: string }) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.0932 2C6.5732 2 2.0932 6.48 2.0932 12C2.0932 17.52 6.5732 22 12.0932 22C17.6132 22 22.0932 17.52 22.0932 12C22.0932 6.48 17.6132 2 12.0932 2ZM11.0932 7V11H7.0932V13H11.0932V17H13.0932V13H17.0932V11H13.0932V7H11.0932ZM4.0932 12C4.0932 16.41 7.6832 20 12.0932 20C16.5032 20 20.0932 16.41 20.0932 12C20.0932 7.59 16.5032 4 12.0932 4C7.6832 4 4.0932 7.59 4.0932 12Z"
        fill={fill}
      />
    </svg>
  );
};
