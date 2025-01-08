# Como usar

### Passo 1

Crie uma pasta chamada `docs` na raiz do seu repositório. É nela que você irá colocar os arquivos markdown (.md) da sua documentação.
Você pode dividir a sua documentação em vários arquivos do jeito que achar melhor (iremos organiza-los mais a frente).
Você pode inserir também imagens e adicioná-las na sua documentação

### Passo 2

Crie um arquivo mkdocs.yml

```yaml
site_name: 'ms-faustao'

nav:
  - 'Home': index.md
  - 'Tutoriais':
      - 'Como rodar': 'tutorials/how-to-run.md'

plugins:
  - techdocs-core
```

É nele que você vai definir a estrutura da sua documentação.
O primeiro campo, site_name é o nome da sua documentação, se for um micro-serviço, geralmente vai ser o nome do mesmo.

O segundo campo irá definir a navegação da documentação. Você pode criar uma página na raiz no formato:

```
- <TITULO>: <ARQUIVO>
```

ou uma pasta:

```
- <TITULO>:
    - <SUBPAGINA>: <ARQUIVO>
```

### Passo 3

Altere a annotation no arquivo catalog-info.yaml informando que a doc está no mesmo repo que o código.

```yaml
...
metadata:
    ...
    annotations:
        backstage.io/techdocs-ref: dir:.
    ...
spec:
    ...

```

### Pronto!

Ao merjar a sua PullRequest a pipeline irá gerar e salvar a documentação e a mesma ficará disponível no catálogo do Moonlight.
