import React from 'react';
import { EntityRefLink } from '@backstage/plugin-catalog-react';

export const OwnerColumn: React.FC<{ owner: string | undefined }> = ({ owner }) => (
  owner ? <EntityRefLink entityRef={owner} defaultKind="Group" hideIcon /> : null
);
