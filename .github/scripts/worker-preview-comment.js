const fs = require('node:fs');

const COMMENT_MARKER = '<!-- boluo-worker-previews -->';

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

function escapeTableCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ');
}

function renderPreviewRow(preview) {
  if (preview.affected === 'false') {
    return `| ${preview.app} | Unchanged | — | — |`;
  }

  if (preview.affected !== 'true') {
    return `| ${preview.app} | Detection failed | — | — |`;
  }

  if (preview.outcome !== 'success') {
    const status = preview.outcome === 'failure' ? 'Upload failed' : 'Not uploaded';
    return `| ${preview.app} | ${status} | — | — |`;
  }

  const output = preview.output;
  if (!output) {
    return `| ${preview.app} | Uploaded, details unavailable | — | — |`;
  }

  const previewUrl = output.preview_alias_url ?? output.preview_url;
  const previewLink = previewUrl ? `[Open preview](${escapeTableCell(previewUrl)})` : 'Unavailable';
  const version = output.version_id ? `\`${escapeTableCell(output.version_id)}\`` : '—';

  return `| ${preview.app} | Uploaded | ${previewLink} | ${version} |`;
}

function renderWorkerPreviewComment(previews, headSha) {
  return [
    COMMENT_MARKER,
    '## Cloudflare Worker Previews',
    '',
    `Updated for commit \`${headSha.slice(0, 7)}\`.`,
    '',
    '| App | Status | Preview | Version |',
    '| --- | --- | --- | --- |',
    ...previews.map(renderPreviewRow),
    '',
    '_Only affected Workers are uploaded. This comment is updated when the PR changes._',
  ].join('\n');
}

module.exports = async function commentWorkerPreviews({ github, context, core, previews }) {
  const issueNumber = context.payload.pull_request?.number;
  if (!issueNumber) {
    throw new Error('Worker preview comments require a pull request event.');
  }

  const hydratedPreviews = previews.map((preview) => ({
    ...preview,
    output: readWranglerOutput(preview.outputPath),
  }));
  const body = renderWorkerPreviewComment(hydratedPreviews, context.payload.pull_request.head.sha);
  const request = {
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber,
  };
  const comments = await github.paginate(github.rest.issues.listComments, {
    ...request,
    per_page: 100,
  });
  const existingComment = comments.find(
    (comment) => comment.user?.type === 'Bot' && comment.body?.includes(COMMENT_MARKER),
  );

  if (existingComment) {
    await github.rest.issues.updateComment({
      owner: request.owner,
      repo: request.repo,
      comment_id: existingComment.id,
      body,
    });
    core.info(`Updated Worker preview comment ${existingComment.id}.`);
  } else {
    const { data: comment } = await github.rest.issues.createComment({
      ...request,
      body,
    });
    core.info(`Created Worker preview comment ${comment.id}.`);
  }
};

module.exports.renderWorkerPreviewComment = renderWorkerPreviewComment;
