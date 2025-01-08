# Como Rodar um Action em ambiente Local?

Antes de continuar, para entender um pouco mais de actions, siga [esta documentação](https://backstage.io/docs/features/software-templates/writing-custom-actions).

## Motivação

Backstage não disponibiliza um padrão para execução de actions sem que seja necessário subir o front-end para teste completo. E como o Moonlight é um portal com inúmeras integrações, subir todas as dependências pode ser um desafio.

A motivação deste documento é simplificar a execução e testes de Actions sem a necessidade de configurar todas as outras dependências, executando de forma desacoplada uma única Action.

## Solução

Para solucionar este problema, unificamos duas formas de executar as Actions em uma só solução, acoplando a Action em uma API que só será executada localmente.

## Passo-a-Passo

- Crie um arquivo standAlone
  Na pasta raíz do plugin (./plugin/{{NOME DO SEU PLUGIN}}) crie um arquivo `standAlone.ts`

- Copie a estrutura abaixo

```
import { PassThrough } from 'stream';
import { loadBackendConfig } from '@backstage/backend-common';
import {
    ScmIntegrations,
} from '@backstage/integration';
import { ActionContext } from '@backstage/plugin-scaffolder-backend'
import { {{THE_NAME_OF_YOUR_ACTION}} } from './actions/{{ACTION_FILE_NAME}}';
import { Config, JsonValue } from '@backstage/config';
import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import { PicPayGithubCredentialsProvider } from "@internal/plugin-picpay-github-backend";

import express from 'express';
import Router from 'express-promise-router';


export interface ServerOptions {
    logger: Logger;
    port: number;
    enableCors: boolean;
}

export async function startStandaloneServer(
    options: ServerOptions,
): Promise<Server> {
    const logger = options.logger.child({ service: 'scaffolder-github-backend' });
    const config = await loadBackendConfig({ logger: options.logger, argv: process.argv });

    const router = (log: Logger, config: Config): express.Router => {
        const integrations = ScmIntegrations.fromConfig(config);
        const githubCredentialsProvider = PicPayGithubCredentialsProvider.fromIntegrations(integrations);

        const router = Router();
        router.use(express.json());

        router.post('/run', async (request, response) => {
            try {
                log.info("request received")

                // setup

                const action = {{THE_NAME_OF_YOUR_ACTION}}(integrations, githubCredentialsProvider);

                // build params
                const repo = request.body?.repo as string;

                // validate
                if (!repo) throw new Error("repo is empty");

                // creating action context
                const ctx: ActionContext<{ repo: string; }> = {
                    logger: options.logger,
                    logStream: new PassThrough(),
                    workspacePath: '/tmp',
                    output: (name: string, value: JsonValue) => {
                        options.logger.info(`finished, ${name}, ${value}`)
                    },
                    input: {
                        repo,
                    },
                    createTemporaryDirectory(): Promise<string> {
                        // Caso seu plugin realize operações de IO, você deve implementar essa função
                        throw new Error('Not implemented');
                    },
                }

                await action.handler(ctx);
                response.send({ status: 'ok' });
            } catch (err) {
                if (typeof err === "string") {
                    response.status(500).send({ message: err });
                  } else if (err instanceof Error) {
                    response.status(500).send({ message: err.message });
                  } else {
                    response.status(500).send({ message: err });
                  }
            }
        });
        return router;
    }

    let service = createServiceBuilder(module)
        .setPort(options.port)
        .addRouter('/', router(logger, config));
    if (options.enableCors) {
        service = service.enableCors({ origin: 'http://localhost:3000' });
    }

    return await service.start().catch(err => {
        logger.error(err);
        process.exit(1);
    });
};
```

_Nota_:\
Substitua {{THE_NAME_OF_YOUR_ACTION}} pela Action exportada.
Substitua {{ACTION_FILE_NAME}} pelo nome do arquivo onde a Action foi exportada.

Neste exemplo, o único parâmetro que a Action recebe via Template é o _repo_, e nota-se que todos os parâmetros necessários para a Action devem ficar no contexto pela chave `input`.

```
input: {
    repo,
},
```

- Abra o arquivo `run.ts` na raíz do plugin e inclua a função startStandaloneServer informando a porta desejada

```
import { startStandaloneServer } from './standAlone';
startStandaloneServer({ logger, port: 7008, enableCors: true }).catch(err => {
  logger.error(err);
  process.exit(1);
});
```

- Acesse a pasta do plugin utilizando o terminal e digite
  `yarn start run.ts --config ../../app-config.local.yaml`
