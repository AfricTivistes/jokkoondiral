#!/usr/bin/env node
// =============================================================
// Crée le jalon « MVP » et une issue par outil MVP (17 outils),
// à partir de scripts/github/issues-mvp.json.
// Idempotent : une issue dont le titre existe déjà est ignorée.
//   GH_REPO=votre-org/votre-fork node scripts/github/issues-mvp.mjs [--dry-run]
// Prérequis : gh authentifié, labels créés (scripts/github/labels.sh).
// =============================================================
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const repo = process.env.GH_REPO || 'AfricTivistes/jokkoondiral';
const dryRun = process.argv.includes('--dry-run');
const tools = JSON.parse(readFileSync(new URL('./issues-mvp.json', import.meta.url)));
const gh = (args) => execFileSync('gh', args, { encoding: 'utf8' });

const MILESTONE = 'MVP';
const milestones = JSON.parse(gh(['api', `repos/${repo}/milestones?state=all&per_page=100`]));
if (!milestones.some((m) => m.title === MILESTONE) && !dryRun) {
  gh(['api', `repos/${repo}/milestones`, '-f', `title=${MILESTONE}`,
    '-f', 'description=17 outils du MVP — premier scrutin pilote début 2027 (docs/ROADMAP.md)']);
  console.log(`✔ jalon ${MILESTONE} créé`);
}

const existing = new Set(
  JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '500', '--json', 'title']))
    .map((i) => i.title),
);

for (const tool of tools) {
  if (existing.has(tool.title)) { console.log(`= existe déjà : ${tool.title}`); continue; }
  if (dryRun) { console.log(`(dry-run) ${tool.title} [${tool.labels.join(', ')}]`); continue; }
  const url = gh(['issue', 'create', '--repo', repo, '--title', tool.title, '--body', tool.body,
    '--milestone', MILESTONE, ...tool.labels.flatMap((l) => ['--label', l])]).trim();
  console.log(`✔ ${tool.title} → ${url}`);
}
