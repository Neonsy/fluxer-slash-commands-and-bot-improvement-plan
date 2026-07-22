import {createHash} from 'node:crypto';
import {readFile, readdir, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const planRoot = path.resolve(scriptDirectory, '../..');
const researchRoot = path.join(planRoot, 'Research');
const rawRoot = path.join(researchRoot, 'raw');
const failures: string[] = [];
const baselineCommit = 'fd62b46faf3505d738f6d5800e787473b14cacd6';

const expectedPublicFiles = new Set([
	'README.md',
	'guide/01-orientation.md',
	'guide/02-system-model.md',
	'guide/03-first-working-bot.md',
	'guide/04-applications-and-installations.md',
	'guide/05-commands-and-discovery.md',
	'guide/06-interactions-and-responses.md',
	'guide/07-community-management.md',
	'guide/08-authority-safety-and-data.md',
	'guide/09-failure-recovery-and-operations.md',
	'guide/10-implementation-roadmap.md',
	'guide/11-open-decisions.md',
	'reference/glossary.md',
	'reference/current-state.md',
	'reference/application-and-installation-contracts.md',
	'reference/command-contracts.md',
	'reference/interaction-and-message-contracts.md',
	'reference/administration-and-authority-contracts.md',
	'reference/operations-and-data-contracts.md',
	'reference/compatibility.md',
	'reference/acceptance-scenarios.md',
]);

const scenarioIds = [
	'G01', 'G02',
	'I01', 'I02', 'I03', 'I04', 'I05', 'I06',
	'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12',
	'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07',
	'P01', 'P02', 'P03',
	'A01', 'A02', 'A03', 'A04',
	'S01', 'S02', 'S03', 'S04',
	'E01', 'E02',
	'X01', 'R01', 'O01', 'O02',
];

async function collectMarkdown(directory: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(directory, {withFileTypes: true})) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...await collectMarkdown(entryPath));
		else if (entry.name.endsWith('.md')) files.push(entryPath);
	}
	return files;
}

function lineNumber(body: string, index: number) {
	return body.slice(0, index).split('\n').length;
}

function headingSlug(heading: string): string {
	return heading
		.toLowerCase()
		.replace(/[`*_~]/g, '')
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

function localMarkdownLinks(body: string) {
	return [...body.matchAll(/\]\(([^)\s]+?\.md)(?:#([^)]+))?\)/g)];
}

const publicFiles = (await collectMarkdown(researchRoot)).filter((file) => !file.startsWith(`${rawRoot}${path.sep}`));
const actualPublicFiles = new Set(publicFiles.map((file) => path.relative(researchRoot, file)));

for (const expected of expectedPublicFiles) {
	if (!actualPublicFiles.has(expected)) failures.push(`Missing public research file: Research/${expected}`);
}
for (const actual of actualPublicFiles) {
	if (!expectedPublicFiles.has(actual)) failures.push(`Unexpected public research file: Research/${actual}`);
}

for (const file of publicFiles) {
	const body = await readFile(file, 'utf8');
	const relativePath = path.relative(planRoot, file);
	for (const [label, value] of [['em dash', '\u2014'], ['semicolon', ';']] as const) {
		let index = body.indexOf(value);
		while (index !== -1) {
			failures.push(`${relativePath}:${lineNumber(body, index)} contains a disallowed ${label}`);
			index = body.indexOf(value, index + 1);
		}
	}
	for (const match of body.matchAll(/^\s*(?:[-+*]|\d+\.)\s+[a-z]/gm)) {
		failures.push(`${relativePath}:${lineNumber(body, match.index)} starts a list item with a lowercase letter`);
	}
	if (/\]\((?:\.\.\/)*raw\//i.test(body) || /Research\/raw\//i.test(body)) {
		failures.push(`${relativePath} links public readers to Research/raw`);
	}

	for (const link of localMarkdownLinks(body)) {
		const target = decodeURIComponent(link[1]);
		if (/^[a-z]+:/i.test(target)) continue;
		const fragment = link[2] ? decodeURIComponent(link[2]).toLowerCase() : undefined;
		const absoluteTarget = path.resolve(path.dirname(file), target);
		if (!absoluteTarget.startsWith(`${researchRoot}${path.sep}`) && absoluteTarget !== path.join(planRoot, 'PRD.md')) {
			failures.push(`${relativePath} links outside the public research contract: ${target}`);
			continue;
		}
		try {
			const metadata = await stat(absoluteTarget);
			if (!metadata.isFile()) throw new Error('not a file');
			if (fragment) {
				const targetBody = await readFile(absoluteTarget, 'utf8');
				const headings = new Set([...targetBody.matchAll(/^#{1,6}\s+(.+)$/gm)].map((heading) => headingSlug(heading[1])));
				if (!headings.has(fragment)) failures.push(`${relativePath} links to a missing heading in ${target}: #${fragment}`);
			}
		} catch {
			failures.push(`${relativePath} links to a missing file: ${target}`);
		}
	}
}

const manifestBody = await readFile(path.join(rawRoot, 'original-files.sha256'), 'utf8');
const manifestEntries = manifestBody.trim().split('\n');
if (manifestEntries.length !== 79) failures.push(`Raw manifest has ${manifestEntries.length} entries instead of 79`);
for (const entry of manifestEntries) {
	const match = entry.match(/^([a-f0-9]{64})  (.+)$/);
	if (!match) {
		failures.push(`Invalid raw manifest entry: ${entry}`);
		continue;
	}
	const rawPath = path.resolve(rawRoot, match[2]);
	if (!rawPath.startsWith(`${rawRoot}${path.sep}`)) {
		failures.push(`Raw manifest path escapes raw/: ${match[2]}`);
		continue;
	}
	try {
		const body = await readFile(rawPath);
		const actualHash = createHash('sha256').update(body).digest('hex');
		if (actualHash !== match[1]) failures.push(`Raw source changed after preservation: Research/raw/${match[2]}`);
	} catch {
		failures.push(`Raw source is missing after preservation: Research/raw/${match[2]}`);
	}
}

const scenarioBody = await readFile(path.join(researchRoot, 'reference/acceptance-scenarios.md'), 'utf8');
const actualScenarioIds = [...scenarioBody.matchAll(/^## SIM-([A-Z][0-9]{2})\b/gm)].map((match) => match[1]);
if (new Set(actualScenarioIds).size !== actualScenarioIds.length) failures.push('Acceptance scenarios contain duplicate SIM identifiers');
if (actualScenarioIds.length !== scenarioIds.length || scenarioIds.some((id) => !actualScenarioIds.includes(id))) {
	failures.push(`Acceptance scenario coverage differs from the required ${scenarioIds.length} scenarios`);
}

function requireInvariant(body: string, pattern: RegExp, description: string) {
	if (!pattern.test(body)) failures.push(`Public contract is missing semantic invariant: ${description}`);
}

const prdBody = await readFile(path.join(planRoot, 'PRD.md'), 'utf8');
const rootReadmeBody = await readFile(path.join(planRoot, 'README.md'), 'utf8');
const researchIndexBody = await readFile(path.join(researchRoot, 'README.md'), 'utf8');
const orientationBody = await readFile(path.join(researchRoot, 'guide/01-orientation.md'), 'utf8');
const publicCorpusBody = [
	prdBody,
	...await Promise.all(publicFiles.map((file) => readFile(file, 'utf8'))),
].join('\n');

const researchEntryIndex = rootReadmeBody.indexOf('[Open the research guide and review paths](Research/README.md)');
const webEntryIndex = rootReadmeBody.indexOf('[Open the web version](https://neonsy.github.io/fluxer-slash-commands-and-bot-improvement-plan/)');
if (researchEntryIndex < 0 || webEntryIndex < 0 || webEntryIndex > researchEntryIndex) {
	failures.push('Root README does not present the web version before the public source entry point');
}
requireInvariant(rootReadmeBody, /tidier reading experience[\s\S]{0,120}not required[\s\S]{0,120}95%[\s\S]{0,160}Markdown files/i, 'root README explains the optional Markdown-driven website');

requireInvariant(researchIndexBody, /does not require dev-chat history or prior knowledge of the Fluxer repository/i, 'research index states its no-context reading contract');
requireInvariant(researchIndexBody, /complete guide uses this front-to-back order/i, 'research index provides a front-to-back guide order');

const startingTerms = [
	'Community',
	'Application',
	'Bot',
	'Slash command',
	'Command picker',
	'Interaction',
	'Ephemeral message',
	'Gateway',
	'Installation',
];
const prdTermsStart = prdBody.indexOf('## Terms used in this plan');
const prdProblemStart = prdBody.indexOf('## Problem and goal');
const orientationTermsStart = orientationBody.indexOf('## Starting vocabulary');
const orientationGapStart = orientationBody.indexOf('## What is missing');
for (const term of startingTerms) {
	if (prdTermsStart < 0 || prdProblemStart < 0 || !prdBody.slice(prdTermsStart, prdProblemStart).includes(`| ${term}`)) {
		failures.push(`PRD opening does not define the starting term: ${term}`);
	}
	if (orientationTermsStart < 0 || orientationGapStart < 0 || !orientationBody.slice(orientationTermsStart, orientationGapStart).includes(`| ${term}`)) {
		failures.push(`Orientation does not define the starting term: ${term}`);
	}
}

for (const file of publicFiles.filter((file) => file.includes(`${path.sep}reference${path.sep}`) && path.basename(file) !== 'glossary.md')) {
	const body = await readFile(file, 'utf8');
	const relativePath = path.relative(planRoot, file);
	if (!body.includes('(../guide/01-orientation.md)')) failures.push(`${relativePath} does not route direct readers to Orientation`);
	if (!body.includes('(glossary.md)')) failures.push(`${relativePath} does not route direct readers to the glossary`);
}

const openingCoverageAreas = [
	'Applications and compatibility',
	'Community installation and permissions',
	'Commands, input, and discovery',
	'Interactions and responses',
	'Messages and ephemeral interaction state',
	'Community administration',
	'Execution authority and audit',
	'Safety, data, and operations',
	'Clients and accessibility',
];
const productRequirementsIndex = prdBody.indexOf('## Product requirements');
for (const area of openingCoverageAreas) {
	const areaIndex = prdBody.indexOf(`| ${area} |`);
	if (areaIndex < 0 || areaIndex > productRequirementsIndex) {
		failures.push(`PRD opening does not cover the key area: ${area}`);
	}
}

requireInvariant(prdBody, /Dependencies:[\s\S]*M` depends on `C`[\s\S]*U` depends on `R`, not on `D` or `A`/, 'PRD distinguishes dependency order from list order');
requireInvariant(prdBody, /complete acceptance catalogue[\s\S]*acceptance-scenarios\.md/i, 'PRD directs readers to the complete acceptance catalogue');
requireInvariant(scenarioBody, /remain[s]? unauthorized in `UNINSTALL_FAILED` until exact owned cleanup converges to `DORMANT`/, 'acceptance reinstall waits for dormant cleanup');
requireInvariant(scenarioBody, /retain at most 1,000 command identities at one time[\s\S]*Safe retirement frees capacity/, 'acceptance retained command cap frees capacity after safe retirement');
requireInvariant(scenarioBody, /Category deny is absolute and cannot be overridden by owner or `Administrator` bypass/, 'acceptance category deny is absolute');
requireInvariant(scenarioBody, /One-use reservation has one conditional winner[\s\S]*proven no effect returns it to available[\s\S]*ambiguous effect remains fail-closed or terminal/i, 'acceptance one-use claims release only after proven no effect');

const publicInvariantChecks = [
	{pattern: /one durable community installation relationship with a fresh generation on reinstall/i, description: 'one generation-bound installation relationship'},
	{pattern: /invite-mode permission selection bounded by the installer's held permissions/i, description: 'invite-mode held-permission boundary'},
	{pattern: /code-defined permission source[\s\S]{0,180}exact authenticated declaration/i, description: 'code-defined exact permission declaration'},
	{pattern: /retained authority ceiling that only the owner or `Administrator` may enlarge later/i, description: 'durable permission ceiling expansion boundary'},
	{pattern: /stable application handles and command identities independent of mutable labels/i, description: 'stable identity independent of presentation'},
	{pattern: /one complete immutable head/i, description: 'complete immutable command publication'},
	{pattern: /submission always rechecks current state/i, description: 'submission-time server reauthorization'},
	{pattern: /first valid initial callback wins one atomic claim/i, description: 'one initial callback claim'},
	{pattern: /without an idempotency key[\s\S]{0,160}does not claim retry deduplication/i, description: 'truthful follow-up idempotency boundary'},
	{pattern: /ephemeral message is not a hidden channel message/i, description: 'separate ephemeral message storage'},
	{pattern: /exact application, message, version, generation, component, and audience binding for controls/i, description: 'component ownership and audience binding'},
	{pattern: /uninstall revokes authority before cleanup/i, description: 'revocation before cleanup'},
	{pattern: /reinstall, reinstatement, and recovery create new authority/i, description: 'non-resurrection after lifecycle changes'},
	{pattern: /rollback may stop[\s\S]{0,260}revocation[\s\S]{0,160}cleanup[\s\S]{0,160}repair/i, description: 'rollback preserves safety and repair paths'},
	{pattern: /pinned development-only `discord\.js` bot changes only its Fluxer credentials/i, description: 'configuration-only compatibility consumer'},
	{pattern: /NFR-05 Accessibility[\s\S]{0,220}keyboard and screen-reader operation/i, description: 'responsive accessibility coverage'},
	{pattern: /external effects remain outside Fluxer's rollback boundary/i, description: 'external application effect boundary'},
	{pattern: /## Architecture review[\s\S]*?Blocks: all product delivery stages/i, description: 'architecture review gate'},
	{pattern: /production rollout approval[\s\S]{0,900}first group to receive production traffic/i, description: 'recorded production rollout approval'},
	{pattern: /`CLIENT_UPDATE_REQUIRED`[\s\S]{0,180}unsupported semantics removed/i, description: 'unsupported command extension result'},
	{pattern: /`INTERACTION_CAPABILITY_REQUIRED`[\s\S]{0,120}required stable capability ID/i, description: 'unsupported response capability result'},
	{pattern: /APPLICATION_CONFIGURATION_UPDATE[\s\S]{0,240}APPLICATION_ADMIN_ACTION_EXECUTE/i, description: 'configuration and administration action names'},
	{pattern: /PUBLISH_APPLICATION_MESSAGE[\s\S]{0,480}DELETE_SELF_ROLE_PANEL/i, description: 'initial declarative native operation IDs'},
	{pattern: /`APPLICATION_SAFE`[\s\S]{0,80}`INVOKER_ONLY`[\s\S]{0,80}redacted reference/i, description: 'delegated result visibility classes'},
	{pattern: /Review state is `REQUESTED`, `NEEDS_INFORMATION`, `REJECTED`, or `ACCEPTED`/i, description: 'suspension review states'},
	{pattern: /`ENUM_SET`[\s\S]{0,100}`CHANNEL_SET`[\s\S]{0,100}`ROLE_SET`[\s\S]{0,100}`USER_SET`/i, description: 'declarative collection setting types'},
];
for (const invariant of publicInvariantChecks) {
	requireInvariant(publicCorpusBody, invariant.pattern, invariant.description);
}
if (/\brecipient-only\b/i.test(publicCorpusBody)) {
	failures.push('Public contract uses recipient-only as the feature name instead of ephemeral message');
}
requireInvariant(
	publicCorpusBody,
	/ephemeral message[\s\S]{0,240}Discord-compatible response APIs[\s\S]{0,120}ephemeral response[\s\S]{0,180}recipient-scoped/i,
	'ephemeral message terminology maps the API and storage terms',
);

const publicQuantityChecks = [
	{pattern: /three seconds for initial acknowledgement/i, description: 'three-second acknowledgement deadline'},
	{pattern: /fifteen minutes for response authority/i, description: 'fifteen-minute response authority'},
	{pattern: /at most five follow-ups per interaction/i, description: 'five-follow-up limit'},
	{pattern: /maximum requested lifetime of 24 hours/i, description: '24-hour ephemeral-message limit'},
	{pattern: /handle release[\s\S]{0,120}24 hours/i, description: '24-hour handle-release limit'},
	{pattern: /confirmation expires after five minutes/i, description: 'five-minute confirmation limit'},
	{pattern: /guild audit[\s\S]{0,120}45-day/i, description: '45-day guild-audit retention'},
	{pattern: /superseded value payloads expire after 45 days/i, description: '45-day superseded-setting retention'},
	{pattern: /90-day inactivity/i, description: '90-day passive-use retention'},
	{pattern: /at least twelve months of replacement overlap/i, description: 'twelve-month protocol overlap'},
	{pattern: /180 days after terminal resolution/i, description: '180-day resolved-report retention'},
	{pattern: /purge must finish within seven days/i, description: 'seven-day post-hold purge target'},
	{pattern: /50 non-deleted applications/i, description: '50-application ownership limit'},
	{pattern: /1,000 command identities/i, description: '1,000-command identity limit'},
	{pattern: /newest 20 recoverable manifests plus at most five explicit pins/i, description: '20 plus 5 manifest retention'},
	{pattern: /100-key application limit/i, description: '100-setting key limit'},
	{pattern: /stops after 25 total attempts/i, description: '25-attempt lifecycle retry limit'},
	{pattern: /no more than three dependent pull requests/i, description: 'three-PR stack limit'},
];
for (const quantity of publicQuantityChecks) {
	requireInvariant(publicCorpusBody, quantity.pattern, quantity.description);
}

const glossaryBody = await readFile(path.join(researchRoot, 'reference/glossary.md'), 'utf8');
requireInvariant(glossaryBody, /\*\*Installation generation\*\*[\s\S]{1,120}A planned server-owned value/, 'installation generation is identified as planned');

const roadmapBody = await readFile(path.join(researchRoot, 'guide/10-implementation-roadmap.md'), 'utf8');
const stageIds = [...roadmapBody.matchAll(/^### Stage ([FISCERPMDAU])\b/gm)].map((match) => match[1]);
const expectedStages = ['F', 'I', 'S', 'C', 'E', 'P', 'R', 'M', 'D', 'A', 'U'];
if (stageIds.join(',') !== expectedStages.join(',')) failures.push(`Implementation stage order is ${stageIds.join(',')} instead of ${expectedStages.join(',')}`);
for (const requiredStatement of ['M depends on C', 'D depends on R', 'A depends on D', 'U does not depend on D or A', 'three dependent pull requests']) {
	if (!roadmapBody.includes(requiredStatement)) failures.push(`Implementation roadmap is missing required dependency wording: ${requiredStatement}`);
}

const translationBody = await readFile(path.join(rawRoot, 'translation-map.md'), 'utf8');
const rawDecisions = await readFile(path.join(rawRoot, 'QAD/decisions.md'), 'utf8');
const decisionIds = [...rawDecisions.matchAll(/^### (QAD-[0-9]+[A-Z]?):/gm)].map((match) => match[1]);
if (decisionIds.length !== 238) failures.push(`Raw decision count is ${decisionIds.length} instead of 238`);

interface DecisionMapping {
	source: string;
	targets: string[];
}

const decisionMappings = new Map<string, DecisionMapping>();
for (const match of translationBody.matchAll(/^\|\s*(QAD-[0-9]+[A-Z]?)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|$/gm)) {
	const id = match[1];
	if (decisionMappings.has(id)) {
		failures.push(`Translation map contains more than one row for ${id}`);
		continue;
	}
	decisionMappings.set(id, {
		source: match[2],
		targets: match[3].split(',').map((target) => target.trim()),
	});
}

for (const id of decisionIds) {
	if (!decisionMappings.has(id)) failures.push(`Translation map does not cover ${id}`);
}
for (const id of decisionMappings.keys()) {
	if (!decisionIds.includes(id)) failures.push(`Translation map contains unknown decision ${id}`);
}

for (const [id, mapping] of decisionMappings) {
	const sourcePath = path.resolve(rawRoot, 'QAD', mapping.source);
	if (!sourcePath.startsWith(`${path.join(rawRoot, 'QAD')}${path.sep}`)) {
		failures.push(`Translation source for ${id} escapes Research/raw/QAD: ${mapping.source}`);
	} else {
		try {
			if (!(await stat(sourcePath)).isFile()) throw new Error('not a file');
		} catch {
			failures.push(`Translation source for ${id} is missing: ${mapping.source}`);
		}
	}

	if (mapping.targets.length === 0) failures.push(`Translation map has no public target for ${id}`);
	for (const target of mapping.targets) {
		const targetPath = path.resolve(researchRoot, target);
		if (!targetPath.startsWith(`${researchRoot}${path.sep}`) || targetPath.startsWith(`${rawRoot}${path.sep}`)) {
			failures.push(`Translation target for ${id} is not public research: ${target}`);
			continue;
		}
		try {
			if (!(await stat(targetPath)).isFile()) throw new Error('not a file');
		} catch {
			failures.push(`Translation target for ${id} is missing: ${target}`);
		}
	}
}

const criticalDecisionChecks = [
	{
		id: 'QAD-207',
		requiredTargets: [
			'guide/02-system-model.md',
			'guide/04-applications-and-installations.md',
			'guide/10-implementation-roadmap.md',
			'reference/current-state.md',
			'reference/application-and-installation-contracts.md',
		],
		invariants: [
			{pattern: /50 non-deleted applications/i, description: 'the planned ownership limit'},
			{pattern: /retained applications count until permanent deletion completes/i, description: 'retained applications count toward the limit'},
			{pattern: /authenticated-default-user requirement[\s\S]{0,120}CAPTCHA[\s\S]{0,120}`MAX_APPLICATIONS`[\s\S]{0,120}10 creation requests per hour/i, description: 'the existing creation controls remain'},
			{pattern: /conditionally reserves one owner slot[\s\S]{0,180}cannot both reserve slot 50/i, description: 'the conditional capacity claim'},
			{pattern: /\| C1 \|[\s\S]{0,240}ceiling to 50 with conditional capacity claims/i, description: 'delivery in C1'},
			{pattern: /separate test, staging, migration, and production applications[\s\S]{0,120}without adding an exception system/i, description: 'the reason for choosing 50'},
			{pattern: /cap rejections[\s\S]{0,80}slot use[\s\S]{0,80}creation abuse[\s\S]{0,80}cleanup backlog[\s\S]{0,80}cost of retained resources/i, description: 'the rollout signals for the selected limit'},
		],
	},
];

for (const check of criticalDecisionChecks) {
	const mapping = decisionMappings.get(check.id);
	if (!mapping) continue;
	for (const target of check.requiredTargets) {
		if (!mapping.targets.includes(target)) failures.push(`Translation map for ${check.id} is missing required target ${target}`);
	}
	const mappedBodies = await Promise.all(mapping.targets.map(async (target) => {
		try {
			return await readFile(path.resolve(researchRoot, target), 'utf8');
		} catch {
			return '';
		}
	}));
	const combinedBody = mappedBodies.join('\n');
	for (const invariant of check.invariants) {
		if (!invariant.pattern.test(combinedBody)) failures.push(`Mapped public contract for ${check.id} is missing ${invariant.description}`);
	}
}

const currentStateBody = await readFile(path.join(researchRoot, 'reference/current-state.md'), 'utf8');
const currentStateSourceUrls = [...currentStateBody.matchAll(/\]\((https:\/\/github\.com\/Neonsy\/fluxer\/(?:blob|tree)\/[^)]+)\)/g)].map((match) => match[1]);
if (currentStateSourceUrls.length < 30) failures.push(`Current-state reference has only ${currentStateSourceUrls.length} pinned source links`);
for (const url of currentStateSourceUrls) {
	if (!url.includes(`/${baselineCommit}`)) failures.push(`Current-state source link is not pinned to ${baselineCommit}: ${url}`);
	if (url.includes('/blob/') && !/#L[0-9]+$/.test(url)) failures.push(`Current-state file link has no line anchor: ${url}`);
}

const currentStateSections = [...currentStateBody.matchAll(/^##\s+(.+)$/gm)];
for (let index = 0; index < currentStateSections.length; index += 1) {
	const section = currentStateSections[index];
	const end = currentStateSections[index + 1]?.index ?? currentStateBody.length;
	const sectionBody = currentStateBody.slice(section.index, end);
	if (!sectionBody.includes('> **Checked in the pinned source:**')) {
		failures.push(`Current-state section has no pinned source note: ${section[1]}`);
	}
}

const sourceFamilies = [
	{directory: 'CS', expected: 6},
	{directory: 'QAD/specs', expected: 36},
	{directory: 'SIM', expected: 12},
];
for (const family of sourceFamilies) {
	const files = (await readdir(path.join(rawRoot, family.directory))).filter((name) => name.endsWith('.md')).sort();
	if (files.length !== family.expected) failures.push(`${family.directory} has ${files.length} Markdown files instead of ${family.expected}`);
	for (const file of files) {
		const sourcePath = `${family.directory}/${file}`;
		if (!translationBody.includes(`\`${sourcePath}\``)) failures.push(`Translation map does not cover ${sourcePath}`);
	}
}

const simulationFiles = (await collectMarkdown(path.join(rawRoot, 'SIM'))).filter((file) => path.basename(file) !== 'README.md');
let projectionCount = 0;
for (const file of simulationFiles) {
	const body = await readFile(file, 'utf8');
	projectionCount += [...body.matchAll(/^\d+\. /gm)].length;
}
if (projectionCount !== 411) failures.push(`Raw scenario projection count is ${projectionCount} instead of 411`);

const contentConfig = await readFile(path.join(planRoot, 'web/src/content.config.ts'), 'utf8');
if (!contentConfig.includes("'!raw/**'")) failures.push('Website content loader does not exclude Research/raw');

if (failures.length > 0) {
	console.error('Research rewrite validation failed:\n');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exitCode = 1;
} else {
	console.log(`Validated ${publicFiles.length} public research files, ${decisionIds.length} decision mappings, ${currentStateSourceUrls.length} pinned current-state sources, ${scenarioIds.length} acceptance scenarios, ${projectionCount} raw scenario projections, and ${manifestEntries.length} preserved raw files.`);
}
