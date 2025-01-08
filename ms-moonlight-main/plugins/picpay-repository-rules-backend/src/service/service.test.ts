import MockDate from 'mockdate';
import { 
  hasNonDefaultNamespaceParents, 
  repositoryOwner, 
  validateDate,
} from './service';
import { Entity } from '@backstage/catalog-model';
import { CatalogApi } from '@backstage/catalog-client';

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
      name: 'ms-test-2',
      namespace: 'picpay',
  },
  spec: {
      lifecycle: 'production',
      owner: 'team-owner',
      type: 'service',
  },
}

const entity2: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
      name: 'ms-test-2',
      namespace: 'picpay',
  },
  spec: {
      lifecycle: 'production',
      type: 'service',
  },
}

describe('repositoryOwner', () => {
  let mockCatalog: jest.Mocked<CatalogApi>;

  beforeEach(() => {
    mockCatalog = {
      getEntities: jest.fn(),
    } as unknown as jest.Mocked<CatalogApi>;
  });

  it('should return the owner when the entity exists', async () => {
    mockCatalog.getEntities.mockResolvedValueOnce({ items: [entity] });

    const repoName = 'test-repo';
    const result = await repositoryOwner(mockCatalog, repoName);

    expect(mockCatalog.getEntities).toHaveBeenCalledWith({
      filter: { 'kind': 'Component', 'metadata.name': repoName },
      fields: ['spec'],
      limit: 1,
    });
    expect(result).toBe('team-owner');
  });

  it('should return undefined when no entities are found', async () => {
    mockCatalog.getEntities.mockResolvedValueOnce({ items: [] });

    const repoName = 'non-existent-repo';
    const result = await repositoryOwner(mockCatalog, repoName);

    expect(mockCatalog.getEntities).toHaveBeenCalledWith({
      filter: { 'kind': 'Component', 'metadata.name': repoName },
      fields: ['spec'],
      limit: 1,
    });
    expect(result).toBeUndefined();
  });

  it('should return undefined when the entity has no owner', async () => {
    mockCatalog.getEntities.mockResolvedValueOnce({ items: [entity2] });

    const repoName = 'repo-without-owner';
    const result = await repositoryOwner(mockCatalog, repoName);

    expect(mockCatalog.getEntities).toHaveBeenCalledWith({
      filter: { 'kind': 'Component', 'metadata.name': repoName },
      fields: ['spec'],
      limit: 1,
    });
    expect(result).toBeUndefined();
  });

  it('should throw an error if catalog.getEntities fails', async () => {
    mockCatalog.getEntities.mockRejectedValueOnce(new Error('Catalog error'));

    const repoName = 'test-repo';
    await expect(repositoryOwner(mockCatalog, repoName)).rejects.toThrow(
      'Catalog error',
    );

    expect(mockCatalog.getEntities).toHaveBeenCalledWith({
      filter: { 'kind': 'Component', 'metadata.name': repoName },
      fields: ['spec'],
      limit: 1,
    });
  });
});

describe("hasNonDefaultNamespaceParents", () => {
  it("should return true if a deep-lavel parents with a namespace different from 'default'", () => {
    const mockData = {
      name: "squad-atlantis",
      description: "Squad Atlantis description",
      kind: "Group",
      namespace: "default",
      type: "team",
      parents: [
        {
          name: "developer_experience",
          description: "Developer Experience",
          kind: "Group",
          namespace: "default",
          type: "business-unit",
          parents: [],
        },
        {
          name: "squad-atlantis",
          description: "Squad responsible for Moonlight, Github, Copilot",
          kind: "Group",
          namespace: "picpay",
          type: "squad",
          parents: [
            {
              name: "tribe-developer-experience",
              description: "Tribe of Developer Experience",
              kind: "Group",
              namespace: "picpay",
              type: "tribe",
              parents: [],
            },
          ],
        },
      ],
    };

    const result = hasNonDefaultNamespaceParents(mockData);
    expect(result).toBe(true);
  });

  it("should return an empty array if all first-level parents have 'default' namespace", () => {
    const mockData = {
      name: "group-default",
      description: "All namespaces are default",
      kind: "Group",
      namespace: "default",
      type: "team",
      parents: [
        {
          name: "subgroup-default",
          description: "Subgroup with default namespace",
          kind: "Group",
          namespace: "default",
          type: "business-unit",
          parents: [],
        },
      ],
    };

    const result = hasNonDefaultNamespaceParents(mockData);
    expect(result).toBe(false);
  });

  it("should return false for an empty parents array", () => {
    const mockData = {
      name: "group-default",
      description: "No parents",
      kind: "Group",
      namespace: "default",
      type: "team",
      parents: [],
    };

    const result = hasNonDefaultNamespaceParents(mockData);

    expect(result).toBe(false);
  });
});


describe('validateDate', () => {
  it('should return true if current date is greater than the provided date', () => {
    const pastDate = new Date('2024-12-15');
    const futureDate = new Date('2024-12-17');

    const currentDate = '2024-12-16';
    MockDate.set(new Date(`${currentDate}T00:00:00.000Z`));

    expect(validateDate(pastDate)).toBe(true);
    expect(validateDate(futureDate)).toBe(false);

    MockDate.reset();
  });

  it('should return false if current date is equal to the provided date', () => {
    const currentDate = '2024-12-16';
    const sameDate = new Date(`${currentDate}T00:00:00.000Z`); 

    MockDate.set(new Date(`${currentDate}T00:00:00.000Z`));

    expect(validateDate(sameDate)).toBe(false);

    MockDate.reset();
  });

  it('should return fase if current date is less than the provided date', () => {
    const currentDate = '2024-12-16';  
    const futureDate = new Date('2024-12-20');
    MockDate.set(new Date(`${currentDate}T00:00:00.000Z`));

    expect(validateDate(futureDate)).toBe(false);

    MockDate.reset();
  });
});
