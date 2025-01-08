/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  KubernetesObjectApi,
  KubernetesListObject,
  KubernetesObject,
  V1Secret,
  KubeConfig,
} from '@kubernetes/client-node';
import * as k8s from './k8s-service';
import * as http from 'http';
import * as net from 'net';

describe('k8s-service', () => {
  process.env.KUBERNETES_URL_QA = 'abcde';
  process.env.KUBERNETES_TOKEN_QA = 'abcde';
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('return without errors', async () => {
    const k8sobject: KubernetesObject[] = [];
    const k8sBody: KubernetesListObject<KubernetesObject> = {
      items: k8sobject,
      apiVersion: undefined,
      kind: undefined,
      metadata: undefined,
    };
    jest
      .spyOn(KubeConfig.prototype, 'loadFromClusterAndUser')
      .mockImplementation();
    jest
      .spyOn(KubeConfig.prototype, 'getCurrentCluster')
      .mockImplementation(() => ({
        name: 'msqa',
        server: 'applfm',
        skipTLSVerify: false,
      }));
    jest.spyOn(KubernetesObjectApi.prototype, 'list').mockImplementation(() =>
      Promise.resolve({
        body: k8sBody,
        response: new http.IncomingMessage(new net.Socket()),
      }),
    );

    const response = await k8s.getSecrets('mock', 'msqa');
    expect(Object.keys(response).length).toBe(0);
  });

  it('return decrypted items', async () => {
    const k8sobject: KubernetesObject[] | V1Secret[] = [
      {
        data: {
          TEST: 'cGljcGF5',
        },
      },
    ];
    const k8sBody: KubernetesListObject<KubernetesObject> = {
      items: k8sobject,
      apiVersion: undefined,
      kind: undefined,
      metadata: undefined,
    };
    jest
      .spyOn(KubeConfig.prototype, 'loadFromClusterAndUser')
      .mockImplementation();
    jest
      .spyOn(KubeConfig.prototype, 'getCurrentCluster')
      .mockImplementation(() => ({
        name: 'msqa',
        server: 'applfm',
        skipTLSVerify: false,
      }));
    jest.spyOn(KubernetesObjectApi.prototype, 'list').mockImplementation(() =>
      Promise.resolve({
        body: k8sBody,
        response: new http.IncomingMessage(new net.Socket()),
      }),
    );

    const response = await k8s.getSecrets('ms-mock', 'msqa');
    const responseKeys = Object.keys(response);
    expect(responseKeys.length).toBe(1);
    expect(response[responseKeys[0]]).toBe('picpay');
  });
});
