import {readdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, '..');
const planRoot = path.resolve(webRoot, '..');
const sourceRoots = [
	path.join(webRoot, 'src/components'),
	path.join(webRoot, 'src/layouts'),
	path.join(webRoot, 'src/pages'),
];
const standaloneFiles = [
	path.join(webRoot, 'README.md'),
	path.join(planRoot, 'PRD.md'),
];
const sourceExtensions = new Set(['.astro', '.ts', '.tsx']);
const quotedSemicolon = /(?:'[^'\n]*;[^'\n]*'|"[^"\n]*;[^"\n]*"|`[^`\n]*;[^`\n]*`)/g;
const tagTextSemicolon = />[^<\n]*;[^<\n]*</g;
const lowercaseListItem = /^\s*(?:[-+*]|\d+\.)\s+[a-z]/gm;
const disallowedPunctuation = [
	{label: 'em dash', value: '\u2014'},
];

async function collectSourceFiles(directory: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(directory, {withFileTypes: true})) {
		const entryPath = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...await collectSourceFiles(entryPath));
		else if (sourceExtensions.has(path.extname(entry.name))) files.push(entryPath);
	}
	return files;
}

function lineNumber(body: string, index: number) {
	return body.slice(0, index).split('\n').length;
}

const files = [...standaloneFiles];
for (const directory of sourceRoots) files.push(...await collectSourceFiles(directory));

const failures: string[] = [];
for (const file of files) {
	const body = await readFile(file, 'utf8');
	const relativePath = path.relative(webRoot, file);

	for (const punctuation of disallowedPunctuation) {
		let index = body.indexOf(punctuation.value);
		while (index !== -1) {
			failures.push(`${relativePath}:${lineNumber(body, index)} contains a disallowed ${punctuation.label}`);
			index = body.indexOf(punctuation.value, index + 1);
		}
	}

	const patterns = file.endsWith('.md') ? [/;/g] : [quotedSemicolon, tagTextSemicolon];
	for (const pattern of patterns) {
		for (const match of body.matchAll(pattern)) {
			failures.push(`${relativePath}:${lineNumber(body, match.index)} contains a semicolon in authored copy`);
		}
	}

	if (file.endsWith('.md')) {
		for (const match of body.matchAll(lowercaseListItem)) {
			failures.push(`${relativePath}:${lineNumber(body, match.index)} starts a list item with a lowercase letter`);
		}
	}

}

if (failures.length > 0) {
	console.error('Copy style validation failed:\n');
	for (const failure of failures) console.error(`- ${failure}`);
	process.exitCode = 1;
} else {
	console.log(`Validated copy style in ${files.length} authored-copy files.`);
}
