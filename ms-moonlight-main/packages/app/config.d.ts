export interface Config {
  /**
  * Visible in frontend and backend
  * @visibility frontend
  */
  localhost?: {
    /**
    * Visible in frontend and backend
    * @visibility frontend
    */
    user: string;
    /**
    * Visible in frontend and backend
    * @visibility frontend
    */
    userEntityRef: string;
  },
  /** Configuration options for the rollbar plugin */
  apis?: {
    /**
     * The Rollbar organization name. This can be omitted by using the `rollbar.com/project-slug` annotation.
     * @see https://backstage.io/docs/features/software-catalog/well-known-annotations#rollbarcomproject-slug
     * @visibility frontend
     */
    metrics?: string;
  };
}
