export const siteBuildId = process.env.SITE_BUILD_ID?.trim() || process.env.GITHUB_SHA?.trim() || 'development';
