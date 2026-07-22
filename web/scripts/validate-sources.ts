import {readFile, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const planRoot = path.resolve(scriptDirectory, '../..');
const researchRoot = path.join(planRoot, 'Research');
const prdPath = path.join(planRoot, 'PRD.md');
const failures: string[] = [];

function headingSlug(heading: string): string {
	return heading
		.toLowerCase()
		.replace(/[`*_~]/g, '')
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-');
}

const prdBody = await readFile(prdPath, 'utf8');
const prdLinks = [...prdBody.matchAll(/\]\((Research\/[^)\s]+?\.md)(?:#([^)]+))?\)/g)];
const sourceBodies = new Map<string, string>();

for (const match of prdLinks) {
	const relativePath = match[1];
	const fragment = match[2];
	if (relativePath.toLowerCase().startsWith('research/raw/')) {
		failures.push(`PRD links to owner-only raw output: ${relativePath}`);
		continue;
	}
	const absolutePath = path.resolve(planRoot, relativePath);
	if (!absolutePath.startsWith(`${researchRoot}${path.sep}`)) {
		failures.push(`PRD source escapes Research/: ${relativePath}`);
		continue;
	}

	try {
		let body = sourceBodies.get(absolutePath);
		if (body === undefined) {
			const metadata = await stat(absolutePath);
			if (!metadata.isFile()) {
				failures.push(`PRD source is not a file: ${relativePath}`);
				continue;
			}
			body = await readFile(absolutePath, 'utf8');
			sourceBodies.set(absolutePath, body);
		}

		if (fragment) {
			const headings = new Set([...body.matchAll(/^#{1,6}\s+(.+)$/gm)].map((heading) => headingSlug(heading[1])));
			if (!headings.has(decodeURIComponent(fragment).toLowerCase())) {
				failures.push(`PRD heading not found in ${relativePath}: #${fragment}`);
			}
		}
	} catch {
		failures.push(`PRD source is missing: ${relativePath}`);
	}
}

if (prdLinks.length === 0) failures.push('No PRD research links were discovered.');

if (failures.length > 0) {
	console.error('Research source validation failed:\n');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exitCode = 1;
} else {
	console.log(`Validated ${prdLinks.length} PRD research links across ${sourceBodies.size} source files.`);
}
