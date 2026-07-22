import {readdir, readFile, stat} from 'node:fs/promises';
import path from 'node:path';

const distDirectory = new URL('../dist/', import.meta.url);
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const configuredBase = process.env.SITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' && repositoryName ? `/${repositoryName}` : '/');
const base = configuredBase === '/' ? '' : `/${configuredBase.replace(/^\/+|\/+$/g, '')}`;
const validationOrigin = 'https://built-site.invalid';
const expectedBuild = process.env.SITE_BUILD_ID?.trim() || process.env.GITHUB_SHA?.trim() || 'development';

function routeFor(relativeFile: string) {
	if (relativeFile === 'index.html') return `${base}/`;
	if (relativeFile.endsWith('/index.html')) return `${base}/${relativeFile.slice(0, -'index.html'.length)}`;
	return `${base}/${relativeFile}`;
}

function decodeAttribute(value: string) {
	return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
}

function escapeRegularExpression(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function targetFileFor(pathname: string) {
	if (base && !pathname.startsWith(`${base}/`) && pathname !== base) return undefined;
	const sitePath = base ? pathname.slice(base.length) || '/' : pathname;
	const relativeTarget = sitePath.endsWith('/') ? `${sitePath.slice(1)}index.html` : sitePath.slice(1);
	const file = new URL(relativeTarget || 'index.html', distDirectory);
	try {
		return (await stat(file)).isFile() ? file : undefined;
	} catch {
		return undefined;
	}
}

const files = (await readdir(distDirectory, {recursive: true, withFileTypes: true}))
	.filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
	.map((entry) => path.relative(new URL('.', distDirectory).pathname, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
	.sort();

const failures: Array<string> = [];
let checkedLinks = 0;

const versionBody = await readFile(new URL('version.json', distDirectory), 'utf8');
let publishedBuild: unknown;
try {
	publishedBuild = JSON.parse(versionBody).build;
} catch {
	failures.push('version.json is not valid JSON');
}
if (publishedBuild !== expectedBuild) {
	failures.push(`version.json identifies ${String(publishedBuild)} instead of ${expectedBuild}`);
}

for (const relativeFile of files) {
	const html = await readFile(new URL(relativeFile, distDirectory), 'utf8');
	const sourceRoute = routeFor(relativeFile);
	if (relativeFile === 'evidence/source/reference/acceptance-scenarios/index.html') {
		const scenarioOutlineLabel = 'SIM-G01: Compatible bot reaches its first public response';
		const scenarioLinks = [...html.matchAll(/<a\b[^>]*href="#sim-g01"[^>]*>([^<]+)<\/a>/g)];
		if (scenarioLinks.length !== 2 || scenarioLinks.some((match) => match[1].trim() !== scenarioOutlineLabel)) {
			failures.push(`${sourceRoute} does not use the scenario title in both document outlines`);
		}
	}
	if (relativeFile !== '404.html') {
		if (!html.includes(`<meta name="site-build" content="${expectedBuild}">`)) {
			failures.push(`${sourceRoute} does not identify build ${expectedBuild}`);
		}
		if (!html.includes('version.json') || !html.includes('_site_build')) {
			failures.push(`${sourceRoute} does not include the stale-page check`);
		}
	}
	for (const match of html.matchAll(/\bhref=(?:"([^"]*)"|'([^']*)')/g)) {
		const href = decodeAttribute(match[1] ?? match[2] ?? '');
		if (!href || href.startsWith('#') || /^(?:mailto|tel|data|javascript):/i.test(href)) continue;
		if (href.includes('/raw/')) failures.push(`${sourceRoute} links to the raw archive ${href}`);

		const target = new URL(href, `${validationOrigin}${sourceRoute}`);
		if (target.origin !== validationOrigin) continue;
		if (/\.md$/i.test(target.pathname)) failures.push(`${sourceRoute} still emits Markdown link ${href}`);
		checkedLinks += 1;
		const targetFile = await targetFileFor(target.pathname);
		if (!targetFile) {
			failures.push(`${sourceRoute} links to missing target ${target.pathname}`);
			continue;
		}

		if (target.hash && targetFile.pathname.endsWith('.html')) {
			const targetHtml = await readFile(targetFile, 'utf8');
			const id = decodeURIComponent(target.hash.slice(1));
			if (!new RegExp(`\\bid=(?:"${escapeRegularExpression(id)}"|'${escapeRegularExpression(id)}')`).test(targetHtml)) {
				failures.push(`${sourceRoute} links to missing heading ${target.pathname}${target.hash}`);
			}
		}
	}
}

if (failures.length > 0) {
	throw new Error(`Built-site link validation failed:\n${failures.join('\n')}`);
}

console.log(`Validated build ${expectedBuild}, ${checkedLinks} internal links, and ${files.length} generated HTML files.`);
