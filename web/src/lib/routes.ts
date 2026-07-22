const normalizedBase = import.meta.env.BASE_URL.endsWith('/')
	? import.meta.env.BASE_URL.slice(0, -1)
	: import.meta.env.BASE_URL;

export function sitePath(path = '/') {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	return `${normalizedBase}${normalizedPath}` || '/';
}

export function researchPath(file: string, needle?: string) {
	const slug = file.replace(/\.md$/i, '').toLowerCase();
	const href = sitePath(`/evidence/source/${slug}/`);
	return needle ? `${href}?ref=${encodeURIComponent(needle)}` : href;
}
