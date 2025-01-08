import { Knex } from 'knex';
import RefreshStateRepository from './refreshState';
import { RefreshState } from '../interfaces/refreshState';

jest.mock('./refreshState');

const mockKnex = {} as Knex;

describe('RefreshStateRepository', () => {
  let refreshStateRepository: RefreshStateRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    refreshStateRepository = new RefreshStateRepository(mockKnex); // Pass the required argument to the constructor
  });

  it('should get entity refresh state', async () => {
    const mockResult: RefreshState[] = [];
    (RefreshStateRepository.prototype.getEntityRefreshState as jest.Mock).mockResolvedValueOnce(mockResult);

    const result = await refreshStateRepository.getEntityRefreshState('entity1');

    expect(result).toEqual(mockResult);
    expect(RefreshStateRepository.prototype.getEntityRefreshState).toHaveBeenCalled();
  });

  it('should force refresh', async () => {
    const mockResult: any[] = [];
    const refreshAt = new Date();
    (RefreshStateRepository.prototype.forceRefresh as jest.Mock).mockResolvedValueOnce(mockResult);

    const result = await refreshStateRepository.forceRefresh('entity1', refreshAt);

    expect(result).toEqual(mockResult);
    expect(RefreshStateRepository.prototype.forceRefresh).toHaveBeenCalled();
  });

  it('should force refresh by location key', async () => {
    const mockResult: any[] = [];
    const refreshAt = new Date();
    (RefreshStateRepository.prototype.forceRefreshByLocationKey as jest.Mock).mockResolvedValueOnce(mockResult);

    const result = await refreshStateRepository.forceRefreshByLocationKey('location1', refreshAt);

    expect(result).toEqual(mockResult);
    expect(RefreshStateRepository.prototype.forceRefreshByLocationKey).toHaveBeenCalled();
  });
});