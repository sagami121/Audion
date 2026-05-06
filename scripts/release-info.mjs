import fs from 'fs';

const changelogPath = 'Changelog.txt';
const outputArgIndex = process.argv.indexOf('--out');
const outputPath = outputArgIndex >= 0 ? process.argv[outputArgIndex + 1] : null;

const changelog = fs.readFileSync(changelogPath, 'utf8').replace(/^\uFEFF/, '');
const headerMatch = changelog.match(
  /^\[(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\]\s*-\s*(.+)$/m
);

if (!headerMatch) {
  console.error(`No release header found in ${changelogPath}`);
  process.exit(1);
}

const headerIndex = headerMatch.index ?? 0;
const bodyStart = headerIndex + headerMatch[0].length;
const nextHeaderMatch = changelog
  .slice(bodyStart)
  .match(/\n\[\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\]\s*-/);
const bodyEnd = nextHeaderMatch ? bodyStart + (nextHeaderMatch.index ?? 0) : changelog.length;
const notes = changelog
  .slice(bodyStart, bodyEnd)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .join('\n');

const version = headerMatch[1];
const date = headerMatch[2].trim();
const tag = version;
const prerelease = /\b(alpha|beta|rc|pre|preview|nightly|canary|dev)\b/i.test(version);

if (outputPath) {
  fs.writeFileSync(outputPath, `${notes}\n`, 'utf8');
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  fs.appendFileSync(
    githubOutput,
    [
      `version=${version}`,
      `tag=${tag}`,
      `date=${date}`,
      `prerelease=${prerelease}`,
      'notes<<__AUDION_RELEASE_NOTES__',
      notes,
      '__AUDION_RELEASE_NOTES__'
    ].join('\n') + '\n',
    'utf8'
  );
} else {
  console.log(`version=${version}`);
  console.log(`tag=${tag}`);
  console.log(`date=${date}`);
  console.log(`prerelease=${prerelease}`);
  console.log(notes);
}
