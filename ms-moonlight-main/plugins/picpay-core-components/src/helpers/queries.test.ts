import { QueryBuilder } from './queries';

describe('queries', () => {
  it('should return the jsonb query', () => {
    expect(QueryBuilder.buildJsonbQuery({ content: { metadata: { name: "squad-faustao" } } })).toBe(`"content"::jsonb->'metadata'->>'name' = 'squad-faustao'`);
  });
  it('should return the json query', () => {
    expect(QueryBuilder.buildJsonLikeQuery({ content: { metadata: { name: "squad-faustao" } } })).toBe(`content LIKE '%"name":"squad-faustao"%'`);
  });
  it('should return the json query for single nested key-value pair', () => {
    expect(
      QueryBuilder.buildJsonLikeQuery({ content: { metadata: { name: "squad-faustao" } } })
    ).toBe(`content LIKE '%"name":"squad-faustao"%'`);
  });
  it('should return the json query for multiple nested key-value pairs', () => {
    expect(
      QueryBuilder.buildJsonLikeQuery({
        content: { metadata: { name: "squad-faustao", type: "exploration" } },
      })
    ).toBe(`content LIKE '%"name":"squad-faustao"%' AND content LIKE '%"type":"exploration"%'`);
  });
  it('should return the json query for multiple root-level keys', () => {
    expect(
      QueryBuilder.buildJsonLikeQuery({
        content: { metadata: { name: "squad-faustao" } },
        status: "active",
      })
    ).toBe(`content LIKE '%"name":"squad-faustao"%' AND status LIKE '%active%'`);
  });
  it('should skip null and undefined values in the json query', () => {
    expect(
      QueryBuilder.buildJsonLikeQuery({
        content: { metadata: { name: null, description: undefined, type: "exploration" } },
      })
    ).toBe(`content LIKE '%"type":"exploration"%'`);
  });
  it('should return the json query for numerical values', () => {
    expect(
      QueryBuilder.buildJsonLikeQuery({
        data: { metrics: { count: 42, success: true } },
      })
    ).toBe(`data LIKE '%"count":42%' AND data LIKE '%"success":true%'`);
  });

});