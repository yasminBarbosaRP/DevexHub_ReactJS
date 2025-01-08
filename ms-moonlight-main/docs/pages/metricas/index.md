# Métricas do Moonlight

No Moonlight, exibimos na página do serviço uma aba de Métricas relacionadas ao serviço. Nessa tela, podemos notar um Filtro para busca por período que afeta todos os gráficos.

Dentre as métricas exibidas, estão:

## Deploy Frequency

É uma das métricas do Accelerate, no caso do Deploy Frequency, refere-se à quantas vezes o serviço foi publicado em produção (ou libera para usuários finais) durante um certo período de tempo.

Atualmente, essa métrica é coletada uma vez ao dia do Harness (por hora, só extraímos informações de deploy do Harness).

Na aba de Métricas, o gráfico de Deploy Frequency é exibido uma média de deploys por dia dentro do período de dias selecionados no filtro.

## Lead Time

Também é uma das métricas do Accelerate, e se refere ao tempo levado desde um commit que não foi levado à produção, até a data e hora que o deploy foi concluído.

No caso do Lead Time, o serviço responsável pelo cálculo analisará todos os commits que não estão atrelados à uma liberação em produção, identificará os que estão entre o primeiro commit encontrado que não foi levado à produção (através da data que foi realizado) até o último commit realizado antes da data de início da liberação em produção, fazem parte de um Lead Time. Então, o serviço sinaliza cada commit com o identificador do Deploy. Essa sinalização ajuda a identificar quando se iniciará o próximo Lead Time à ser calculado. Os commits são coletados do Github a cada 3 horas.

Quando falamos dos commit, são considerados apenas os commits que foram levados à branch principal do repositório.

!!! warning "Caso um produto realize deploys em produção à partir de uma branch que não é a principal/default do repositório ou com um Pull Request que não foi fechado, o cálculo do Lead Time da aplicação sofrerá impactos e a aplicação terá um Lead Time longo e não preciso. Estes casos não serão corrigidos no cálculo do Lead Time por se tratar de má prática de deploy."
