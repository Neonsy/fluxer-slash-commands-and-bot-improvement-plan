import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';

const prd = defineCollection({
	loader: glob({
		pattern: 'PRD.md',
		base: '..',
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		verified_commit: z.string(),
		verified_date: z.coerce.date(),
	}),
});

const research = defineCollection({
	loader: glob({
		pattern: ['**/*.md', '!raw/**'],
		base: '../Research',
		deferRender: true,
	}),
});

export const collections = {prd, research};
