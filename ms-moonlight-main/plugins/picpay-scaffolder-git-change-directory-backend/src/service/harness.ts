const syncGitopsHarness = (ms: number): Promise<any> => {
  return new Promise(res => setTimeout(res, ms));
};

export const syncGitopsWithHarness = async (): Promise<void> => {
  await syncGitopsHarness(1000);
};
