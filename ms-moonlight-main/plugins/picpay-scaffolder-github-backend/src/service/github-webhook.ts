import { Logger } from "winston";
import { Octokit } from "octokit";

const OWNER = 'PicPay';

export const deleteWebhookByURL = async (
    logger: Logger,
    octokit: Octokit,
    repository: string,
    webhookUrl: string,
) => {
    const { data: webhooks } = await octokit.rest.repos.listWebhooks({ owner: OWNER, repo: repository })
    const webhook = webhooks.find(hook => hook.config.url === webhookUrl)

    if (webhook === undefined) {
        logger.error(`webhook ${webhookUrl} not found in ${repository}`)
        return
    }
    logger.debug(`deleting webhook ${webhook}`)
    const response = await octokit.rest.repos.deleteWebhook({
        owner: OWNER,
        repo: repository,
        hook_id: webhook?.id ?? -1,
    })

    if (Math.floor(response.status / 100) !== 2) {
        logger.error(`error on deleting webhook, statuscode: ${response.status}`)
        return
    }

    logger.info(`webhook ${webhookUrl} from ${repository} was deleted`)
}
