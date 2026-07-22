export function trackDocumentOutline(shell: HTMLElement) {
	const outlineLinks = [...shell.querySelectorAll<HTMLAnchorElement>('nav[aria-label="Document contents"] a[href^="#"]')];
	const sectionIds = [...new Set(outlineLinks.map((link) => decodeURIComponent(link.hash.slice(1))))];
	const sections = sectionIds
		.map((id) => document.getElementById(id))
		.filter((section): section is HTMLElement => section !== null);
	let activeSectionId = '';
	let updateFrame = 0;

	function setActiveSection(id: string) {
		if (id === activeSectionId) return;
		activeSectionId = id;
		let visibleActiveLink: HTMLAnchorElement | undefined;
		for (const link of outlineLinks) {
			if (decodeURIComponent(link.hash.slice(1)) === id) {
				link.setAttribute('aria-current', 'location');
				if (link.getClientRects().length > 0) visibleActiveLink ??= link;
			} else link.removeAttribute('aria-current');
		}

		const scrollContainer = visibleActiveLink?.closest<HTMLElement>('.document-sidebar, .source-sidebar');
		if (visibleActiveLink && scrollContainer && scrollContainer.scrollHeight > scrollContainer.clientHeight) {
			const containerBounds = scrollContainer.getBoundingClientRect();
			const linkBounds = visibleActiveLink.getBoundingClientRect();
			const breathingRoom = 12;
			if (linkBounds.top < containerBounds.top + breathingRoom) scrollContainer.scrollTop -= containerBounds.top + breathingRoom - linkBounds.top;
			else if (linkBounds.bottom > containerBounds.bottom - breathingRoom) scrollContainer.scrollTop += linkBounds.bottom - containerBounds.bottom + breathingRoom;
		}
	}

	function updateActiveSection() {
		updateFrame = 0;
		if (sections.length === 0) return;
		const readingLine = 112;
		let active = sections[0];
		for (const section of sections) {
			if (section.getBoundingClientRect().top > readingLine) break;
			active = section;
		}
		if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) active = sections.at(-1) ?? active;
		setActiveSection(active.id);
	}

	function scheduleActiveSectionUpdate() {
		if (!updateFrame) updateFrame = requestAnimationFrame(updateActiveSection);
	}

	window.addEventListener('scroll', scheduleActiveSectionUpdate, {passive: true});
	window.addEventListener('resize', scheduleActiveSectionUpdate);
	window.addEventListener('hashchange', scheduleActiveSectionUpdate);
	window.addEventListener('load', scheduleActiveSectionUpdate, {once: true});
	updateActiveSection();
}
