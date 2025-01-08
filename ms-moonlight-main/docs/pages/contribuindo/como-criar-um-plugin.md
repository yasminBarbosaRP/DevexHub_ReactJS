# Como criar um Plugin?

### DOC Em desenvolvimento...

Moonlight é uma plataforma para pessoas desenvolvedoras dentro do PicPay, e como plataforma, o time Atlantis incentiva o inner-source, que é a contribuição interna de times para a construção do portal.

Para facilitar a contrubuição, criamos um Makefile na raiz do repositório, que você pode utilizar como apoio na criação de plugins.

## Criando um plugin backend

Execute o comando abaixo e preencha as informações solicitadas:
`make plugin-backend`

## Testes Unitários

Recomendamos que todos os plugins desenvolvidos tenham pelo menos uma cobertura de 80% de testes unitários.

Para executar todos os testes, digite no terminal:
`make test`

E para executar os testes em apenas um arquivo, digite:
`yarn test plugins/{NOME DO SEU PLUGIN}/{CAMINHO PARA O ARQUIVO}.ts`

### Erros Comuns

1. TextEncoder is not defined

Um dos erros comuns ao executar os testes em um plugin novo é encarar este problema.

```ReferenceError: TextEncoder is not defined

    15 |  */
    16 |
> 17 | import { getVoidLogger } from '@backstage/backend-common';
```

Este erro ocorre pela falta de configuração do Jest (framework de testes que utilizamos no Moonlight) no arquivo package.json do seu plugin.

Basta adicionar a seguinte informações no arquivo package.json

````
"jest": {
    "testEnvironment": "node",
    "verbose": true,
    "silent": false
},```

2. Problemas ao gerar coverage do plugin

Caso encontre este problema, a primeira coisa a se fazer é conferir se o arquivo setupTests.js na raiz do plugin está presente e configurado corretamente.

Abaixo o conteúdo do setupTests.js
````

import '@testing-library/jest-dom';
import 'cross-fetch/polyfill';

```

```
