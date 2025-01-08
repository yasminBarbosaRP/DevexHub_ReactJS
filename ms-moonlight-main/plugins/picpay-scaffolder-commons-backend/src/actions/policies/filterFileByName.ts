import { RepositoryDetails } from '../../interfaces/githubRepository';

export const filterBy = (filename: string) => {
  return (components: any, repositoryDetails: RepositoryDetails) => {
    const { logger } = components;
    const filtered = repositoryDetails.files.filter(
      file => file.name === filename,
    );
    logger.info(
      `There is ${filtered.length} ${filename} created for this repository`,
    );

    if (filtered.length <= 0) {
      throw new Error(`There is no ${filename} in this repository`);
    }
  };
};
