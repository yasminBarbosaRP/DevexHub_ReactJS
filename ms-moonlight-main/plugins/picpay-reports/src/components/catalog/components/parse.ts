import { CatalogComponent, RelationsType } from './types';

const getRelationsParents = (components: any) => {
  let bu: string;
  const relationsBu: any = {};
  const relationsType: string[] = [
    RelationsType.HASMEMBER,
    RelationsType.CHILDOF,
    RelationsType.OWNEROF,
  ];

  components.forEach((component: any) => {
    const joinChildSquad: string[] = [];

    if (component.kind === 'Group') {
      bu = component.metadata.name;

      component.relations.map((relation: any) => {
        if (relationsType.includes(relation.type.toUpperCase())) {
          return;
        }

        if (relation.type.toUpperCase() === RelationsType.PARENTOF) {
          joinChildSquad.push(relation.target.name);
        }

        relationsBu[bu] = joinChildSquad;
      });
    }
  });

  return relationsBu;
};

export const parseCatalogComponent = (components: any): CatalogComponent[] => {
  const catalogComponent: CatalogComponent[] = [];
  const buRelations = getRelationsParents(components);

  components.forEach((component: any) => {
    let bu = '';

    if (component.kind !== 'Component') {
      return;
    }

    const {
      metadata: { name, description, tags, annotations, labels },
      spec: { owner, lifecycle },
    } = component;

    let language;
    let framework;
    let cluster_prd;
    let cluster_hom;
    let repository_id;
    let repository_created_at;

    if (labels) {
      language = labels[`moonlight.picpay/language`];
      framework = labels[`moonlight.picpay/framework`];
    }

    if (annotations) {
      cluster_prd = annotations[`moonlight.picpay/cluster-prd`];
      cluster_hom = annotations[`moonlight.picpay/cluster-hom`];
      repository_id = annotations['github.com/repository-id'];
      repository_created_at = annotations['github.com/repository-created-at'];
    }

    Object.keys(buRelations).forEach((buName: string) => {
      if (buRelations[buName].length === 0) {
        return;
      }

      if (buRelations[buName].includes(owner)) {
        bu = buName;
      }
    });

    catalogComponent.push({
      ms: name,
      description,
      bu,
      owner,
      language,
      framework,
      tags: (tags ?? []).join(', '),
      lifecycle,
      cluster_prd,
      cluster_hom,
      repository_id,
      repository_created_at,
    });
  });

  return catalogComponent;
};
