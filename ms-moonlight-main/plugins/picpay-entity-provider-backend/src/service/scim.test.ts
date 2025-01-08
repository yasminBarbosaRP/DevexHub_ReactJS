import { applyOperations, createUser, deleteUser, departmentChanged, getManagerEmail, isNowInactive, managerChanged, mapContentToScimUser, patchUser } from './scim';

describe('mapContentToScimUser', () => {
  it('should map content to ScimUser', () => {
    const content = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: '123',
      userName: 'john.doe',
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [
        {
          value: 'john.doe@example.com',
          primary: true,
        },
      ],
      externalId: 'abc123',
      active: true,
      meta: {
        created: '2022-01-01T00:00:00Z',
        lastModified: '2022-01-01T00:00:00Z',
      },
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        employeeNumber: '12345',
        costCenter: '12345',
        organization: '12345',
      },
    };

    const result = mapContentToScimUser(content);

    expect(result).toEqual({
      schemas: [
        'urn:ietf:params:scim:schemas:core:2.0:User',
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
      ],
      id: '123',
      userName: 'john.doe',
      name: {
        givenName: 'John',
        familyName: 'Doe',
      },
      emails: [
        {
          value: 'john.doe@example.com',
          primary: true,
        },
      ],
      externalId: 'abc123',
      active: true,
      meta: {
        created: '2022-01-01T00:00:00Z',
        lastModified: '2022-01-01T00:00:00Z',
      },
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        employeeNumber: '12345',
        costCenter: '12345',
        organization: '12345',
      },
    });
  });
});

describe('applyOperations', () => {
  it('should add a new property to the content', () => {
    const content = { name: 'John Doe' };
    const operations = [{ op: 'add', path: 'age', value: 25 }];

    const result = applyOperations(content, operations);

    expect(result).toEqual({ name: 'John Doe', age: 25 });
  });

  it('should replace an existing property in the content', () => {
    const content = { name: 'John Doe', age: 25, address: { city: 'NY' } };
    const operations = [
      { op: 'replace', path: 'age', value: 30 },
      { op: 'replace', path: 'address.city', value: 'New York' },
    ];

    const result = applyOperations(content, operations);

    expect(result).toEqual({
      name: 'John Doe',
      age: 30,
      address: { city: 'New York' },
    });
  });

  it('should remove a property from the content', () => {
    const content = {
      name: 'John Doe',
      age: 30,
      children: ['Alice', 'Bob', 'Charlie'],
      address: { city: 'New York', state: 'NY' },
    };
    const operations = [
      { op: 'remove', path: 'age' },
      { op: 'remove', path: 'children[1]' },
      { op: 'remove', path: 'address.state' },
    ];

    const result = applyOperations(content, operations);

    expect(result).toEqual({
      name: 'John Doe',
      children: ['Alice', 'Charlie'],
      address: { city: 'New York' },
    });
  });

  it('should handle multiple operations', () => {
    const content = { name: 'John Doe', age: 30 };
    const operations = [
      { op: 'replace', path: 'name', value: 'Jane Doe' },
      { op: 'add', path: 'city', value: 'New York' },
      { op: 'remove', path: 'age' },
    ];

    const result = applyOperations(content, operations);

    expect(result).toEqual({ name: 'Jane Doe', city: 'New York' });
  });

  it('should replace the manager property', () => {
    const content = {
      name: 'John Doe',
      age: 30,
      address: { city: 'NY' },
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        manager: 'Alice',
      },
    };
    const operations = [
      {
        op: 'replace',
        path: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager',
        value: 'Bob',
      },
    ];

    const result = applyOperations(content, operations);

    expect(result).toEqual({
      name: 'John Doe',
      age: 30,
      address: { city: 'NY' },
      'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
        manager: 'Bob',
      },
    });
  });
});

describe('isNowInactive', () => {
  it('should return true when user becomes inactive', () => {
    expect(isNowInactive({ active: 'true' }, { active: 'false' })).toBe(true);
    expect(isNowInactive({ active: true }, { active: false })).toBe(true);
  });

  it('should return false when user remains active', () => {
    expect(isNowInactive({ active: 'true' }, { active: 'true' })).toBe(false);
    expect(isNowInactive({ active: false }, { active: false })).toBe(false);
  });
});

describe('managerChanged', () => {
  const ENTERPRISE = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';
  
  it('should return true when manager changes', () => {
    const oldContent = { [ENTERPRISE]: { manager: 'manager1@test.com' } };
    const newContent = { [ENTERPRISE]: { manager: 'manager2@test.com' } };
    expect(managerChanged(oldContent, newContent)).toBe(true);
  });

  it('should return false when manager remains the same', () => {
    const oldContent = { [ENTERPRISE]: { manager: 'manager1@test.com' } };
    const newContent = { [ENTERPRISE]: { manager: 'manager1@test.com' } };
    expect(managerChanged(oldContent, newContent)).toBe(false);
  });

  it('should handle undefined managers', () => {
    expect(managerChanged({}, {})).toBe(false);
    expect(managerChanged({ [ENTERPRISE]: {} }, { [ENTERPRISE]: {} })).toBe(false);
  });
});

describe('departmentChanged', () => {
  const ENTERPRISE = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';
  
  it('should return true when department changes', () => {
    const oldContent = { [ENTERPRISE]: { department: 'IT' } };
    const newContent = { [ENTERPRISE]: { department: 'HR' } };
    expect(departmentChanged(oldContent, newContent)).toBe(true);
  });

  it('should return false when department remains the same', () => {
    const oldContent = { [ENTERPRISE]: { department: 'IT' } };
    const newContent = { [ENTERPRISE]: { department: 'IT' } };
    expect(departmentChanged(oldContent, newContent)).toBe(false);
  });

  it('should handle undefined departments', () => {
    expect(departmentChanged({}, {})).toBe(false);
    expect(departmentChanged({ [ENTERPRISE]: {} }, { [ENTERPRISE]: {} })).toBe(false);
  });
});

describe('getManagerEmail', () => {
  const ENTERPRISE = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';
  
  it('should return manager email when present', () => {
    const content = { [ENTERPRISE]: { manager: 'manager@test.com' } };
    expect(getManagerEmail(content)).toBe('manager@test.com');
  });

  it('should return undefined when no manager', () => {
    expect(getManagerEmail({})).toBeUndefined();
    expect(getManagerEmail({ [ENTERPRISE]: {} })).toBeUndefined();
  });
});

describe('mapContentToScimUser additional cases', () => {
  it('should handle minimal required fields', () => {
    const content = {
      id: '123',
      userName: 'john.doe',
      name: { givenName: 'John', familyName: 'Doe' },
      emails: [],
      externalId: 'ext123',
      active: true,
      meta: { resourceType: 'User', location: '/users/123' }
    };

    const result = mapContentToScimUser(content);
    expect(result.schemas).toEqual(['urn:ietf:params:scim:schemas:core:2.0:User']);
    expect(result.id).toBe('123');
  });

  it('should ignore unknown properties', () => {
    const content = {
      id: '123',
      userName: 'john.doe',
      name: { givenName: 'John', familyName: 'Doe' },
      emails: [],
      externalId: 'ext123',
      active: true,
      meta: { resourceType: 'User', location: '/users/123' },
      unknownProp: 'value'
    };

    const result = mapContentToScimUser(content);
    expect(result).not.toHaveProperty('unknownProp');
  });
});

describe('applyOperations additional cases', () => {
  it('should handle empty operations array', () => {
    const content = { name: 'John' };
    expect(applyOperations(content, [])).toEqual(content);
  });

  it('should ignore unknown operations', () => {
    const content = { name: 'John' };
    const operations = [{ op: 'unknown', path: 'name', value: 'Jane' }];
    expect(applyOperations(content, operations)).toEqual(content);
  });

  it('should handle nested enterprise schema operations', () => {
    const ENTERPRISE = 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User';
    const content = {
      [ENTERPRISE]: {
        department: 'IT',
        manager: 'boss@test.com'
      }
    };
    
    const operations = [
      { 
        op: 'replace', 
        path: `${ENTERPRISE}:department`,
        value: 'HR'
      },
      {
        op: 'remove',
        path: `${ENTERPRISE}:manager`
      }
    ];

    const result = applyOperations(content, operations);
    expect(result[ENTERPRISE].department).toBe('HR');
    expect(result[ENTERPRISE].manager).toBeUndefined();
  });
});

// Mock implementations
const mockDatabase = {
  microsoftAD: jest.fn().mockReturnValue({
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }),
  additionalInformationRepository: jest.fn().mockReturnValue({
    makeItOrphan: jest.fn(),
    get: jest.fn().mockResolvedValue([]),
  }),
  members: jest.fn().mockReturnValue({
    remove: jest.fn(),
    removeFromGroup: jest.fn(),
  }),
  events: jest.fn().mockReturnValue({
    save: jest.fn(),
  }),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(),
};

describe('createUser', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: {
        userName: 'john.doe@example.com',
        name: { givenName: 'John', familyName: 'Doe' },
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should create a user successfully', async () => {
    await createUser(req, res, mockLogger, mockDatabase as any);

    expect(mockDatabase.microsoftAD().create).toHaveBeenCalledWith({
      id: 'john.doe@example.com',
      content: expect.objectContaining({
        userName: 'john.doe@example.com',
      }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockDatabase.events().save).toHaveBeenCalledWith(
      'POST',
      '/scim/v2/Users',
      200,
      req.body
    );
  });

  it('should handle creation errors', async () => {
    const error = new Error('Creation failed');
    mockDatabase.microsoftAD().create.mockRejectedValueOnce(error);

    await createUser(req, res, mockLogger, mockDatabase as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Creation failed',
      status: 400,
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('patchUser', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: { id: 'john.doe@example.com' },
      body: {
        Operations: [
          { op: 'replace', path: 'name.givenName', value: 'John' },
          { op: 'replace', path: 'name.familyName', value: 'Doe' },
          { op: 'replace', path: 'userName', value: 'john.doe@example.com' },
          { op: 'replace', path: 'active', value: 'False' }  // Changed from false to 'False'
        ],
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should update a user successfully', async () => {
    const existingUser = {
      id: 'john.doe@example.com',
      content: { 
        active: 'True',  // Changed from true to 'True'
        userName: 'john.doe@example.com',
        name: {
          givenName: 'John',
          familyName: 'Doe'
        }
      },
    };
    mockDatabase.microsoftAD().get.mockResolvedValueOnce(existingUser);
    mockDatabase.microsoftAD().update.mockResolvedValueOnce(undefined);

    await patchUser(req, res, mockLogger, mockDatabase as any);

    expect(mockDatabase.microsoftAD().update).toHaveBeenCalledWith(
      'john.doe@example.com',
      {
        active: 'False',  // Changed from false to 'False'
        name: {
          givenName: 'John',
          familyName: 'Doe'
        },
        userName: 'john.doe@example.com',
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockDatabase.events().save).toHaveBeenCalledWith(
      'PATCH',
      '/scim/v2/Users/john.doe@example.com',
      200,
      req.body
    );
  });

  it('should handle user not found', async () => {
    mockDatabase.microsoftAD().get.mockResolvedValueOnce(null);

    await patchUser(req, res, mockLogger, mockDatabase as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'User not found',
      status: 404,
    });
  });

  it('should handle update errors', async () => {
    const existingUser = {
      id: 'john.doe@example.com',
      content: { active: true },
    };
    mockDatabase.microsoftAD().get.mockResolvedValueOnce(existingUser);
    mockDatabase.microsoftAD().update.mockRejectedValueOnce(new Error('Update failed'));

    await patchUser(req, res, mockLogger, mockDatabase as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('deleteUser', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      params: { id: 'john.doe@example.com' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should delete a user successfully', async () => {
    const existingUser = {
      id: 'john.doe@example.com',
      content: { active: true },
    };
    mockDatabase.microsoftAD().get.mockResolvedValueOnce(existingUser);

    await deleteUser(req, res, mockLogger, mockDatabase as any);

    expect(mockDatabase.microsoftAD().update).toHaveBeenCalledWith(
      'john.doe@example.com',
      expect.objectContaining({ active: false })
    );
    expect(mockDatabase.additionalInformationRepository().makeItOrphan).toHaveBeenCalled();
    expect(mockDatabase.members().remove).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('should handle user not found', async () => {
    mockDatabase.microsoftAD().get.mockResolvedValueOnce(null);

    await deleteUser(req, res, mockLogger, mockDatabase as any);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'User not found',
      status: 404,
    });
  });

  it('should handle deletion errors', async () => {
    const existingUser = {
      id: 'john.doe@example.com',
      content: { active: true },
    };
    mockDatabase.microsoftAD().get.mockResolvedValueOnce(existingUser);
    mockDatabase.microsoftAD().update.mockRejectedValueOnce(new Error('Delete failed'));

    await deleteUser(req, res, mockLogger, mockDatabase as any);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockDatabase.events().save).toHaveBeenCalledWith(
      'DELETE',
      '/scim/v2/Users/john.doe@example.com',
      400,
      expect.any(String)
    );
  });
});
