import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  ECRClient,
  CreateRepositoryCommand,
  PutLifecyclePolicyCommand,
  SetRepositoryPolicyCommand,
} from '@aws-sdk/client-ecr';

export const createNewEcrRepoAction = () => {
  return createTemplateAction<{ serviceName: string }>({
    id: 'moonlight:create-repo-ecr',
    schema: {
      input: {
        required: ['serviceName'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'ServiceName',
            description: 'The name of the service',
          },
        },
      },
    },
    async handler(ctx) {
      const repoName = ctx.input.serviceName;
      const client = new ECRClient({
        region: 'us-east-1',
        credentials: {
          accessKeyId: String(process.env.MOONLIGHT_ECR_ACCESS_KEY),
          secretAccessKey: String(process.env.MOONLIGHT_ECR_SECRET_ACCESS_KEY),
        },
      });
      const command = new CreateRepositoryCommand({
        repositoryName: `picpay-dev/${repoName}`,
        imageScanningConfiguration: {
          scanOnPush: true,
        },
      });
      try {
        await client.send(command);
      } catch (e: any) {
        if (e.name === 'RepositoryAlreadyExistsException') {
          ctx.logger.info(`Repositório ${repoName} já existe no ECR.`);
        }
      }

      const permissionsCommand = new SetRepositoryPolicyCommand({
        force: false,
        policyText: getEcrPermissionPolicy(),
        repositoryName: `picpay-dev/${repoName}`,
      });
      await client.send(permissionsCommand);

      const lifecycleCommand = new PutLifecyclePolicyCommand({
        lifecyclePolicyText: getEcrLifecyclePolicy(),
        repositoryName: `picpay-dev/${repoName}`,
      });
      await client.send(lifecycleCommand);
    },
  });
};

function getEcrPermissionPolicy(): string {
  return `{
  "Version": "2008-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountPushPull",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::951866070284:root",
          "arn:aws:iam::462495227997:root",
          "arn:aws:iam::306435756286:root",
          "arn:aws:iam::943505626568:root"
        ]
      },
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchCheckLayerAvailability",
        "ecr:BatchGetImage",
        "ecr:CompleteLayerUpload",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetDownloadUrlForLayer",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ]
    }
  ]
}`;
}

function getEcrLifecyclePolicy(): string {
  return `{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only one untagged images, expire all others",
      "selection": {
        "tagStatus": "untagged",
        "countType": "imageCountMoreThan",
        "countNumber": 1
      },
      "action": {
        "type": "expire"
      }
    },
    {
      "action": {
        "type": "expire"
      },
      "selection": {
        "countType": "imageCountMoreThan",
        "countNumber": 300,
        "tagStatus": "tagged",
        "tagPrefixList": [
          "build"
        ]
      },
      "description": "Keep only 300 images with tag 'build-', expire all others",
      "rulePriority": 2
    },
    {
      "action": {
        "type": "expire"
      },
      "selection": {
        "countType": "imageCountMoreThan",
        "countNumber": 50,
        "tagStatus": "tagged",
        "tagPrefixList": [
          "pr"
        ]
      },
      "description": "Keep only 50 images with tag 'pr-', expire all others",
      "rulePriority": 3
    }
  ]
}`;
}
