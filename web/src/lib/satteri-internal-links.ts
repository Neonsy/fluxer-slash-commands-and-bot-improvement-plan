import type {SatteriProcessorOptions} from '@astrojs/markdown-satteri';
import {dirname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

interface InternalLinksOptions {
	base?: string;
}

type MdastPlugin = NonNullable<SatteriProcessorOptions['mdastPlugins']>[number];

function normalizedBase(base = '/') {
	if (base === '/') return '';
	return `/${base.replace(/^\/+|\/+$/g, '')}`;
}

function splitTarget(url: string) {
	const hashIndex = url.indexOf('#');
	const queryIndex = url.indexOf('?');
	const pathEnd = [hashIndex, queryIndex].filter((index) => index >= 0).sort((a, b) => a - b)[0] ?? url.length;
	return {
		path: url.slice(0, pathEnd),
		query: queryIndex >= 0 ? url.slice(queryIndex, hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : url.length) : '',
		hash: hashIndex >= 0 ? url.slice(hashIndex) : '',
	};
}

export function satteriInternalLinks(options: InternalLinksOptions = {}): MdastPlugin {
	const base = normalizedBase(options.base);

	return {
		name: 'fluxer-internal-links',
		link(node, context) {
			const url = node.url;
			if (!url || url.startsWith('#') || url.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(url)) return;

			const target = splitTarget(url);
			if (!target.path.toLowerCase().endsWith('.md') || !context.fileURL) return;

			const sourcePath = fileURLToPath(context.fileURL);
			const absoluteTarget = resolve(dirname(sourcePath), target.path);
			const normalizedTarget = absoluteTarget.split(sep).join('/');

			if (/\/PRD\.md$/i.test(normalizedTarget) && !normalizedTarget.includes('/Research/')) {
				context.setProperty(node, 'url', `${base}/${target.query}${target.hash}`);
				return;
			}

			const researchMarker = '/Research/';
			const researchIndex = normalizedTarget.lastIndexOf(researchMarker);
			if (researchIndex < 0) return;

			const researchFile = normalizedTarget.slice(researchIndex + researchMarker.length);
			const slug = researchFile.replace(/\.md$/i, '').toLowerCase();
			const decisionMarker = target.hash.match(/^#(qad-\d+)$/i)?.[1].toUpperCase();
			const rewritten = decisionMarker
				? `${base}/evidence/source/${slug}/?ref=${encodeURIComponent(decisionMarker)}`
				: `${base}/evidence/source/${slug}/${target.query}${target.hash}`;
			context.setProperty(node, 'url', rewritten);
		},
	};
}
