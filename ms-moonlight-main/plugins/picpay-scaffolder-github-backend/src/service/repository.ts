import { Octokit } from 'octokit';
import {
  RepositorySettings,
  RepositoryVisibility,
} from '@internal/plugin-picpay-scaffolder-github-common';

export default class RepositoryService {
  constructor(
    private readonly githubOwner: string,
    private readonly octokit: Octokit,
  ) { }

  public async canUpdateSetting(repositoryName: string, username: string) {
    const { data: permissionLevel } =
      await this.octokit.rest.repos.getCollaboratorPermissionLevel({
        owner: this.githubOwner,
        repo: repositoryName,
        username: username,
      });

    return ['admin', 'maintain', 'write'].includes(permissionLevel.permission);
  }

  public async getCurrentSetting(repositoryName: string) {
    const { data: repo } = await this.octokit.rest.repos.get({
      owner: this.githubOwner,
      repo: repositoryName,
    });

    const { data: branchProtection } =
      await this.octokit.rest.repos.getBranchProtection({
        branch: repo.default_branch,
        owner: this.githubOwner,
        repo: repo.name,
      });

    const { data: teams } = await this.octokit.rest.repos.listTeams({
      owner: this.githubOwner,
      repo: repo.name,
    });

    const team = teams.find(t => t.slug === 'picpay-developers');

    const permissionBind: { [name: string]: string } = {
      pull: RepositoryVisibility.restricted,
      push: RepositoryVisibility.public,
      admin: RepositoryVisibility.public,
      maintain: RepositoryVisibility.public,
      triage: RepositoryVisibility.public,
    };

    const visibility = team?.permission
      ? permissionBind[team.permission]
      : RepositoryVisibility.private;

    return {
      projectSlug: repo.full_name,
      requireApprovals:
        branchProtection?.required_pull_request_reviews
          ?.required_approving_review_count,
      requireCodeOwnerReviews:
        branchProtection?.required_pull_request_reviews
          ?.require_code_owner_reviews,
      deleteBranchOnMerge: repo.delete_branch_on_merge,
      visibility: visibility,
    };
  }

  public async upsertSettings(
    repositoryName: string,
    setting: RepositorySettings,
    branchProtectionExists: boolean = true,
  ) {
    try {
      if (!setting.requireApprovals || setting.requireApprovals < 0) {
        throw new Error('number of approvers must be greater than zero');
      }

      const { data: repo } = await this.octokit.rest.repos.get({
        owner: this.githubOwner,
        repo: repositoryName,
      });

      let restrictions: any | undefined = undefined;
      let required_status_checks: any | undefined = undefined;
      let enforce_admins: any | undefined = undefined;

      if (branchProtectionExists) {
        const { data } = await this.octokit.rest.repos.getBranchProtection({
          branch: repo.default_branch,
          owner: this.githubOwner,
          repo: repo.name,
        });

        restrictions = data.restrictions
        required_status_checks = data.required_status_checks;
        enforce_admins = data.enforce_admins;
      }

      await this.octokit.rest.repos.update({
        branch: repo.default_branch,
        owner: this.githubOwner,
        repo: repositoryName,
        delete_branch_on_merge: setting.deleteBranchOnMerge,
      });

      switch (setting.visibility) {
        case RepositoryVisibility.public:
          this.octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
            org: this.githubOwner,
            owner: this.githubOwner,
            repo: repositoryName,
            team_slug: 'picpay-developers',
            permission: 'push',
          });
          break;

        case RepositoryVisibility.restricted:
          this.octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
            org: this.githubOwner,
            owner: this.githubOwner,
            repo: repositoryName,
            team_slug: 'picpay-developers',
            permission: 'pull',
          });
          break;

        case RepositoryVisibility.private:
          this.octokit.rest.teams.removeRepoInOrg({
            org: this.githubOwner,
            owner: this.githubOwner,
            repo: repositoryName,
            team_slug: 'picpay-developers',
          });
          break;

        default:
      }

      let restrict: any = null;

      if (restrictions) {
        restrict = {
          teams: (restrictions?.teams ?? [])
            .filter((item: any) => item.slug)
            .map((item: any) => `${item.slug}`),
          users: (restrictions?.users ?? [])
            .filter((item: any) => item.login)
            .map((item: any) => `${item.login}`),
          apps: (restrictions?.apps ?? [])
            .filter((item: any) => item.slug)
            .map((item: any) => `${item.slug}`),
        };
      }

      await this.octokit.rest.repos.updateBranchProtection({
        branch: repo.default_branch,
        owner: this.githubOwner,
        repo: repositoryName,
        required_pull_request_reviews: {
          required_approving_review_count: setting.requireApprovals,
          require_code_owner_reviews: setting.requireCodeOwnerReviews,
        },
        enforce_admins: enforce_admins?.enabled ?? false,
        required_status_checks: {
          strict: required_status_checks?.strict ?? false,
          checks: (required_status_checks?.checks ?? []).map((item: any) => ({
            context: item.context,
            app_id: item.app_id ?? undefined,
          })),
        } as any,
        restrictions: restrict,
      });
    } catch (err: any) {
      if (err.message?.includes('Branch not protected')) {
        await this.upsertSettings(repositoryName, setting, false);
        return;
      }
      throw err;
    }
  }
}
