const fs = require('node:fs');

const PREVIEW_ENVIRONMENT = 'preview';

function readWranglerOutput(outputPath) {
  if (!outputPath || !fs.existsSync(outputPath)) {
    return undefined;
  }

  const entries = fs
    .readFileSync(outputPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  return entries.reverse().find((entry) => entry.type === 'version-upload');
}

async function createWorkerPreviewDeployments({ github, context, core, logUrl, workers }) {
  const pullRequest = context.payload.pull_request;
  if (!pullRequest) {
    throw new Error('Worker preview deployments require a pull request event.');
  }

  for (const worker of workers) {
    if (worker.affected !== 'true') {
      continue;
    }

    const { data: deployment } = await github.rest.repos.createDeployment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: pullRequest.head.sha,
      task: 'deploy',
      auto_merge: false,
      required_contexts: [],
      environment: PREVIEW_ENVIRONMENT,
      description: `Cloudflare Worker preview for ${worker.app}`,
      transient_environment: true,
      production_environment: false,
      payload: {
        app: worker.app,
        pull_request: pullRequest.number,
      },
    });

    core.setOutput(worker.app, String(deployment.id));
    await github.rest.repos.createDeploymentStatus({
      owner: context.repo.owner,
      repo: context.repo.repo,
      deployment_id: deployment.id,
      state: 'in_progress',
      environment: PREVIEW_ENVIRONMENT,
      log_url: logUrl,
      description: `Uploading ${worker.app} Worker preview`,
      auto_inactive: false,
    });
    core.info(`Created ${worker.app} preview deployment ${deployment.id}.`);
  }
}

function getFinalStatus(worker) {
  if (worker.outcome === 'success') {
    const output = worker.output ?? readWranglerOutput(worker.outputPath);
    const environmentUrl = output?.preview_alias_url ?? output?.preview_url;
    const versionDescription = output?.version_id
      ? `${worker.app}: uploaded Worker version ${output.version_id}`
      : `${worker.app}: uploaded Worker preview`;

    return {
      state: 'success',
      description: versionDescription,
      environmentUrl,
    };
  }

  if (worker.outcome === 'failure') {
    return {
      state: 'failure',
      description: `${worker.app}: Worker preview upload failed`,
    };
  }

  return {
    state: 'error',
    description: `${worker.app}: Worker preview was not uploaded`,
  };
}

async function finalizeWorkerPreviewDeployments({ github, context, core, logUrl, workers }) {
  for (const worker of workers) {
    if (!worker.deploymentId) {
      continue;
    }

    const deploymentId = Number(worker.deploymentId);
    if (!Number.isSafeInteger(deploymentId)) {
      throw new Error(`Invalid deployment ID for ${worker.app}: ${worker.deploymentId}`);
    }

    const finalStatus = getFinalStatus(worker);
    await github.rest.repos.createDeploymentStatus({
      owner: context.repo.owner,
      repo: context.repo.repo,
      deployment_id: deploymentId,
      state: finalStatus.state,
      environment: PREVIEW_ENVIRONMENT,
      environment_url: finalStatus.environmentUrl,
      log_url: logUrl,
      description: finalStatus.description,
      auto_inactive: false,
    });
    core.info(`Marked ${worker.app} preview deployment ${deploymentId} as ${finalStatus.state}.`);
  }
}

module.exports = {
  createWorkerPreviewDeployments,
  finalizeWorkerPreviewDeployments,
  getFinalStatus,
};
