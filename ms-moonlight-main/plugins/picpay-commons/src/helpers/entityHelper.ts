export const isEntityRef = (entity: string): boolean => {
    const regex = /^(?:[^\s:]+:)?[^\s/]+\/[^\s/]+$/;
    return regex.test(entity);
};