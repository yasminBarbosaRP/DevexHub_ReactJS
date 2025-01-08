# Como as informações do catálogo são atualizadas

O plugin Discovery procura um arquivo chamado catalog-info.yaml nos repositórios que começam com picpay-dev-ms. O arquivo catalog-info está no formato YAML, que facilita a conservação, funciona de forma declarativa e com configuração estática.

!!! warning "Os times são responsáveis por atualizar e manter o catalog-info.yaml."

Para atualizar as informações, basta criar um PR, alterando o dado desejado. Uma vez mergeado, o Moonlight irá automaticamente atualizar os metadados no software Catalog.

O plugin também é integrado com o [GitHub (organização PicPay)](https://github.com/PicPay), obtendo todos os usuários e grupos, para identificação do proprietário (Owner) do serviço e qual Squad é responsável pelo mesmo .
