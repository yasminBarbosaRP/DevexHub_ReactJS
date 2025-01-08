import React, { useEffect } from 'react';
import { EntitySwitch } from '@backstage/plugin-catalog';
import {
  TektonCI,
  isTektonCIAvailable,
} from '@janus-idp/backstage-plugin-tekton';

export const Cicd = () => {
  useEffect(() => {
    const styleElement = document.createElement('style');

    styleElement.textContent = `
      .warning-panel {
        display: none !important;
      }
    `;

    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <EntitySwitch>
      {/* highlight-add-start */}
      <EntitySwitch.Case if={isTektonCIAvailable}>
        <TektonCI />
      </EntitySwitch.Case>
      {/* highlight-add-end */}
    </EntitySwitch>
  );
};
