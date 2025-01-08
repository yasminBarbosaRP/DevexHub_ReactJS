import React from 'react';
import { Link } from '@backstage/core-components';

export const TitleColumn: React.FC<{ title: string; linkPr: string }> = ({ title, linkPr }) => (
  <Link to={linkPr} target="_blank" rel="noopener noreferrer">
    {title}
  </Link>
);
