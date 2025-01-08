import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayPipelineRunPlugin, PicpayPipelineRunPage } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayPipelineRunPlugin)
  .addPage({
    element: <PicpayPipelineRunPage />,
    title: 'Root Page',
    path: '/picpay-pipeline-run',
  })
  .render();
