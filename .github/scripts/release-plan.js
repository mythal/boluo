const STAGING_EVENTS = new Set(['schedule', 'workflow_dispatch']);

module.exports = async function planRelease({ github, context, core }) {
  const isMasterPush = context.eventName === 'push' && context.ref === 'refs/heads/master';

  if (isMasterPush) {
    core.setOutput('branch', 'master');
    core.setOutput('deploy_staging', 'true');
    core.setOutput('push_images', 'true');
    core.setOutput('sha', context.sha);
    return;
  }

  if (!STAGING_EVENTS.has(context.eventName)) {
    core.setOutput('branch', context.ref.replace('refs/heads/', ''));
    core.setOutput('deploy_staging', 'false');
    core.setOutput('push_images', 'true');
    core.setOutput('sha', context.sha);
    return;
  }

  const { data: master } = await github.rest.repos.getBranch({
    owner: context.repo.owner,
    repo: context.repo.repo,
    branch: 'master',
  });
  const masterSha = master.commit.sha;

  let deployStaging = true;
  if (context.eventName === 'schedule') {
    const { data: runs } = await github.rest.actions.listWorkflowRuns({
      owner: context.repo.owner,
      repo: context.repo.repo,
      workflow_id: 'release.yml',
      branch: 'master',
      status: 'success',
      per_page: 1,
    });
    const previousSha = runs.workflow_runs[0]?.head_sha;
    deployStaging = previousSha !== masterSha;
    core.info(
      previousSha
        ? `Latest successful staging SHA: ${previousSha}`
        : 'No previous successful staging release found.',
    );
  }

  core.info(`Current master SHA: ${masterSha}`);
  core.info(
    deployStaging
      ? 'Staging will be released.'
      : 'Skipping staging because master has no new commits.',
  );
  core.setOutput('branch', 'master');
  core.setOutput('deploy_staging', String(deployStaging));
  core.setOutput('push_images', String(deployStaging));
  core.setOutput('sha', masterSha);
};
