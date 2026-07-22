import {siteBuildId} from '@/lib/site-build';

export const prerender = true;

export function GET() {
	return new Response(`${JSON.stringify({build: siteBuildId})}\n`, {
		headers: {
			'Cache-Control': 'no-store',
			'Content-Type': 'application/json',
		},
	});
}
