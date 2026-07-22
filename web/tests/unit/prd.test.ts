import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const prd = await readFile(new URL('../../../PRD.md', import.meta.url), 'utf8');
const acceptanceScenarios = await readFile(new URL('../../../Research/reference/acceptance-scenarios.md', import.meta.url), 'utf8');

describe('PRD structure', () => {
	it('contains the required review and delivery sections in order', () => {
		const sections = [
			'Summary',
			'Terms used in this plan',
			'Problem and goal',
			'What exists today and what is missing',
			'What this will let people do',
			'Users and their needs',
			'Success measures',
			'What is and is not included',
			'Product requirements',
			'Requirements that apply across the platform',
			'Delivery sequence',
			'Open decisions and risks',
			'Definition of done',
			'Detailed research and technical references',
		];

		let previousIndex = -1;
		for (const section of sections) {
			const index = prd.indexOf(`## ${section}`);
			expect(index, `missing or misordered section: ${section}`).toBeGreaterThan(previousIndex);
			previousIndex = index;
		}
	});

	it('uses unique requirement identifiers for every platform boundary', () => {
		const identifiers = [...prd.matchAll(/^#### ((?:APP|CMD|INT|MSG|ADM|AUTH|OPS)-\d+)/gm)].map((match) => match[1]);
		expect(identifiers.length).toBeGreaterThan(0);
		expect(new Set(identifiers).size).toBe(identifiers.length);
		for (const prefix of ['APP', 'CMD', 'INT', 'MSG', 'ADM', 'AUTH', 'OPS']) {
			expect(identifiers.some((identifier) => identifier.startsWith(`${prefix}-`))).toBe(true);
		}
	});

	it('records NFRs and links the product contract to research files', () => {
		const nfrs = [...prd.matchAll(/\| (NFR-\d+) [^|]+ \|/g)].map((match) => match[1]);
		expect(new Set(nfrs)).toEqual(new Set(['NFR-01', 'NFR-02', 'NFR-03', 'NFR-04', 'NFR-05', 'NFR-06', 'NFR-07']));
		for (const source of [
			'Research/reference/current-state.md',
			'Research/reference/compatibility.md',
			'Research/reference/application-and-installation-contracts.md',
			'Research/reference/command-contracts.md',
			'Research/reference/interaction-and-message-contracts.md',
			'Research/reference/administration-and-authority-contracts.md',
			'Research/reference/operations-and-data-contracts.md',
			'Research/reference/acceptance-scenarios.md',
			'Research/guide/10-implementation-roadmap.md',
			'Research/guide/11-open-decisions.md',
		]) expect(prd).toContain(source);
	});

	it('keeps a short set of behavior examples on the homepage and the complete catalogue in research', () => {
		const representative = [...prd.matchAll(/#sim-([a-z]\d+)/g)].map((match) => match[1].toUpperCase());
		const complete = [...acceptanceScenarios.matchAll(/^## SIM-([A-Z]\d+)/gm)].map((match) => match[1]);
		expect(new Set(representative).size).toBeGreaterThan(0);
		expect(new Set(representative).size).toBeLessThan(new Set(complete).size);
		expect(prd).toContain('[complete acceptance catalogue](Research/reference/acceptance-scenarios.md)');
	});
});
