import sitemap from '@astrojs/sitemap';
import {satteri} from '@astrojs/markdown-satteri';
import {defineConfig} from 'astro/config';
import {satteriInternalLinks} from './src/lib/satteri-internal-links.ts';

const repositoryParts = process.env.GITHUB_REPOSITORY?.split('/') ?? [];
const repositoryOwner = repositoryParts[0];
const repositoryName = repositoryParts[1];
const onGitHubPages = process.env.GITHUB_ACTIONS === 'true' && Boolean(repositoryOwner && repositoryName);

const site = process.env.SITE_URL ?? (onGitHubPages ? `https://${repositoryOwner}.github.io` : 'http://localhost:4321');
const base = process.env.SITE_BASE_PATH ?? (onGitHubPages ? `/${repositoryName}` : '/');

export default defineConfig({
	output: 'static',
	site,
	base,
	trailingSlash: 'always',
	integrations: [sitemap()],
	markdown: {
		processor: satteri({mdastPlugins: [satteriInternalLinks({base})]}),
		shikiConfig: {
			theme: 'github-dark-high-contrast',
		},
	},
});
