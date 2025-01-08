export class QueryBuilder {
  public static buildJsonbQuery(json: Record<string, any>): string {
    const parseObject = (obj: Record<string, any>, parentKey: string = '', isTopLevel: boolean = true): string[] => {
      return Object.entries(obj).map(([key, value]) => {
        const fullKey = isTopLevel ? `"${key}"::jsonb` : `${parentKey}->'${key}'`;

        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          return parseObject(value, fullKey, false);
        }

        const comparisonValue = typeof value === 'string' ? `'${value}'` : value;
        return isTopLevel ? `${fullKey}->>'${key}' = ${comparisonValue}` : `${parentKey}->>'${key}' = ${comparisonValue}`;
      }).flat();
    };

    const conditions = parseObject(json);
    return conditions.join(' AND ');
  }
  
  public static buildJsonLikeQuery(json: Record<string, any>): string {
    function extractConditionsForRootKey(columnName: string, jsonobj: any): string[] {
      function extractKeyValue(obj: any): string[] {
        let result: string[] = [];
        Object.entries(obj).forEach(([key, value]) => {
          if (value === undefined || value === null) {
            return;
          }
          if (typeof value === 'object' && !Array.isArray(value)) {
            result = result.concat(extractKeyValue(value));
          } else {
            const comparisonValue = typeof value === 'string' ? `"${value}"` : value;
            result.push(`${columnName} LIKE '%"${key}":${comparisonValue}%'`);
          }
        });
        return result;
      }
  
      return extractKeyValue(jsonobj);
    }
  
    const allConditions: string[] = [];
  
    Object.entries(json).forEach(([columnName, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        allConditions.push(...extractConditionsForRootKey(columnName, value));
      } else {
        const comparisonValue = typeof value === 'string' ? `${value}` : value;
        if (typeof comparisonValue === 'boolean') {
          allConditions.push(`${columnName} = ${comparisonValue === true ? 1 : 0}`);
        } else {
          allConditions.push(`${columnName} LIKE '%${comparisonValue}%'`);
        }
      }
    });
  
    return allConditions.join(' AND ');
  }
}