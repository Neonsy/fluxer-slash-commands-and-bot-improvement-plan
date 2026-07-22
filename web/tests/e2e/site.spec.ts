import AxeBuilder from '@axe-core/playwright';
import {expect, test, type Page} from '@playwright/test';

async function publicPaths(page: Page) {
	await page.goto('/evidence/');
	const sources = await page.locator('#document-index a.document-row').evaluateAll((links) => links.map((link) => new URL((link as HTMLAnchorElement).href).pathname));
	return ['/', '/evidence/', ...sources];
}

test('homepage presents the PRD and primary navigation', async ({page}, testInfo) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Fluxer Bot Platform');
	await expect(page.getByRole('heading', {name: 'Fluxer Bot Platform v1'})).toBeVisible();
	if (testInfo.project.name === 'mobile') await page.locator('.mobile-nav').getByText('Menu', {exact: true}).click();
	const primaryNavigation = page.locator(testInfo.project.name === 'mobile' ? '.mobile-nav nav' : '.desktop-nav');
	await expect(primaryNavigation.getByRole('link', {name: 'PRD', exact: true})).toHaveAttribute('aria-current', 'page');
	await expect(primaryNavigation.getByRole('link', {name: 'Open decisions', exact: true})).toHaveAttribute('href', '/evidence/source/guide/11-open-decisions/');
	await expect(primaryNavigation.getByRole('link', {name: 'Technical details', exact: true})).toHaveAttribute('href', '/evidence/');
});

test('PRD contents follows the current scroll position', async ({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'The desktop project displays the persistent contents navigation');
	await page.goto('/');
	const contents = page.locator('.document-sidebar nav');
	await expect(contents.getByRole('link', {name: 'Summary', exact: true})).toHaveAttribute('aria-current', 'location');

	await page.locator('#delivery-sequence').evaluate((heading) => heading.scrollIntoView({block: 'start'}));
	await expect(contents.getByRole('link', {name: 'Delivery sequence', exact: true})).toHaveAttribute('aria-current', 'location');
	await expect(contents.getByRole('link', {name: 'Summary', exact: true})).not.toHaveAttribute('aria-current');

	await page.goto('/#open-decisions-and-risks');
	await expect(contents.getByRole('link', {name: 'Open decisions and risks', exact: true})).toHaveAttribute('aria-current', 'location');
});

test('research file contents follows the current scroll position', async ({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'The desktop project displays the persistent contents navigation');
	await page.goto('/evidence/source/guide/08-authority-safety-and-data/');
	const contents = page.locator('.desktop-outline');
	await expect(contents.getByRole('link', {name: 'Four different execution paths', exact: true})).toHaveAttribute('aria-current', 'location');

	await page.locator('#class-1-exact-private-confirmation').evaluate((heading) => heading.scrollIntoView({block: 'start'}));
	await expect(contents.getByRole('link', {name: 'Class 1, exact private confirmation', exact: true})).toHaveAttribute('aria-current', 'location');
	await expect(contents.getByRole('link', {name: 'Four different execution paths', exact: true})).not.toHaveAttribute('aria-current');

	await page.goto('/evidence/source/guide/08-authority-safety-and-data/#class-1-exact-private-confirmation');
	await expect(contents.getByRole('link', {name: 'Class 1, exact private confirmation', exact: true})).toHaveAttribute('aria-current', 'location');

	await page.goto('/evidence/source/reference/acceptance-scenarios/');
	const lastHeading = page.locator('#coverage-check');
	await lastHeading.evaluate((heading) => heading.scrollIntoView({block: 'start'}));
	const lastLink = page.locator('.desktop-outline').getByRole('link', {name: 'Coverage check', exact: true});
	await expect(lastLink).toHaveAttribute('aria-current', 'location');
	await expect(lastLink).toBeInViewport();
});

test('research guide directs readers and finds exact sections and specific questions', async ({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'One browser project is sufficient for the full-text index');
	await page.goto('/evidence/');
	await expect(page.getByRole('heading', {name: 'Research and technical details'})).toBeVisible();
	await expect(page.locator('.start-path-card').first()).toContainText('Complete path');
	await expect(page.locator('.start-path-card').first()).toHaveAttribute('href', '/evidence/source/readme/');
	await expect(page.getByRole('link', {name: /New to Fluxer Orientation/})).toHaveAttribute('href', '/evidence/source/guide/01-orientation/');
	const search = page.getByRole('searchbox', {name: 'Search research files'});
	await expect(search).toBeInViewport();
	const productTrack = page.locator('.responsibility-track').filter({hasText: 'Product behavior and moderation'});
	await expect(page.locator('.responsibility-track-list details')).toHaveCount(0);
	await expect(productTrack.getByRole('link', {name: 'First working bot', exact: true})).toBeVisible();
	await page.getByRole('button', {name: 'Open decisions'}).click();
	await expect(page.getByRole('button', {name: 'Open decisions'})).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('#document-index a:not([hidden])')).toHaveCount(1);
	await expect(page.locator('#filter-status')).toHaveText('1 file shown');

	await page.getByRole('button', {name: 'All files'}).click();
	await search.fill('staged rollout rolls back');
	const exactResult = page.locator('#pagefind-results a[href$="#sim-o01"]');
	await expect(exactResult).toBeVisible();

	for (const [query, expectedPath] of [
		['what exists today', '/evidence/source/reference/current-state/'],
		['how uninstall works', '/evidence/source/guide/04-applications-and-installations/'],
		['duplicate slash commands', '/evidence/source/guide/05-commands-and-discovery/'],
		['private responses', '/evidence/source/guide/06-interactions-and-responses/'],
		['recipient-only responses', '/evidence/source/guide/06-interactions-and-responses/'],
	]) {
		await search.fill(query);
		await expect(page.locator('#pagefind-results a').first()).toHaveAttribute('href', expectedPath);
	}

	await page.keyboard.press('Meta+K');
	await expect(search).toBeFocused();
});

test('a slower old search cannot replace a newer query', async ({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'One browser project is sufficient for the search race');
	let releaseFragment: (() => void) | undefined;
	let fragmentStarted: (() => void) | undefined;
	const fragmentGate = new Promise<void>((resolve) => { releaseFragment = resolve; });
	const fragmentRequest = new Promise<void>((resolve) => { fragmentStarted = resolve; });
	let held = false;
	await page.route('**/pagefind/fragment/**', async (route) => {
		if (!held) {
			held = true;
			fragmentStarted?.();
			await fragmentGate;
		}
		await route.continue();
	});
	await page.goto('/evidence/');
	const search = page.getByRole('searchbox', {name: 'Search research files'});
	await search.fill('application');
	await fragmentRequest;
	await search.fill('zzzz-no-match');
	await expect(page.locator('#search-status')).toHaveText('0 results');
	releaseFragment?.();
	await page.waitForTimeout(350);
	await expect(search).toHaveValue('zzzz-no-match');
	await expect(page.locator('#search-status')).toHaveText('0 results');
	await expect(page.locator('#pagefind-results .document-row')).toHaveCount(0);
});

test('compiled Markdown navigation works without JavaScript', async ({browser, baseURL}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'One browser project is sufficient for no-JavaScript navigation');
	const context = await browser.newContext({baseURL, javaScriptEnabled: false});
	const page = await context.newPage();
	await page.goto('/');
	await page.getByRole('link', {name: 'Compatibility contract', exact: true}).click();
	await expect(page).toHaveURL(/evidence\/source\/reference\/compatibility\/$/);
	await page.goto('/evidence/source/readme/');
	await page.locator('#main-content').getByRole('link', {name: 'PRD', exact: true}).first().click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', {name: 'Fluxer Bot Platform v1'})).toBeVisible();
	await context.close();
});

test('all published pages pass automated accessibility checks', async ({page}) => {
	test.slow();
	for (const path of await publicPaths(page)) {
		await page.goto(path);
		const results = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
		expect(results.violations, `${path} accessibility violations`).toEqual([]);
	}
});

test('all published pages stay within the viewport', async ({page}) => {
	test.slow();
	for (const path of await publicPaths(page)) {
		await page.goto(path);
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
		expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(1);
	}
});

test('long outlines are complete and the guide has continuity', async ({page}, testInfo) => {
	if (testInfo.project.name === 'desktop') {
		await page.goto('/evidence/source/reference/acceptance-scenarios/');
		const outlineLinks = page.locator('.desktop-outline a');
		const articleHeadings = page.locator('.research-prose h2, .research-prose h3');
		await expect(outlineLinks).toHaveCount(await articleHeadings.count());
		await expect(outlineLinks.getByText('Coverage check', {exact: true})).toBeVisible();
		await page.goto('/evidence/source/guide/04-applications-and-installations/');
		const chapterNavigation = page.getByRole('navigation', {name: 'Guide chapter navigation'});
		await expect(chapterNavigation.locator('.chapter-link.previous')).toHaveAttribute('href', '/evidence/source/guide/03-first-working-bot/');
		await expect(chapterNavigation.locator('.chapter-link.next')).toHaveAttribute('href', '/evidence/source/guide/05-commands-and-discovery/');
		await expect(page.locator('.research-prose #continue-reading')).toBeHidden();
		await expect(page.locator('.research-prose #continue-reading + ul')).toBeHidden();
		await expect(page.locator('.desktop-outline a[href="#continue-reading"]')).toHaveCount(0);
	} else {
		await page.goto('/evidence/source/reference/current-state/');
		const outline = page.locator('details.mobile-outline');
		await outline.getByText('On this page', {exact: true}).click();
		await expect(outline.getByRole('link', {name: 'What still needs to be built'})).toBeVisible();
		await page.goto('/');
		await page.locator('details.mobile-document-outline').getByText('PRD contents', {exact: true}).click();
		await expect(page.locator('details.mobile-document-outline').getByRole('link', {name: 'Open decisions and risks', exact: true})).toBeVisible();
	}
});

test('unknown routes return to the homepage', async ({page}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'Redirect behavior is independent of viewport size');
	await page.goto('/missing-audit-route/');
	await expect(page).toHaveURL(/\/$/);
});
