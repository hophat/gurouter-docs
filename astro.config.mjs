// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.gurouter.com',
	integrations: [
		starlight({
			title: 'GuRouter Docs',
			logo: { src: './src/assets/logo.png', alt: 'GuRouter' },
			customCss: ['./src/styles/custom.css'],
			components: {
				Footer: './src/components/Footer.astro',
				Hero: './src/components/Hero.astro',
				PageSidebar: './src/components/PageSidebar.astro',
			},
			editLink: {
				baseUrl: 'https://github.com/hophat/gurouter-docs/edit/main/',
			},
			lastUpdated: true,
			pagefind: true,
			head: [
				{
					tag: 'meta',
					attrs: { 'name': 'theme-color', content: '#fbfbfc' },
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Agent Setup', slug: 'getting-started/agents' },
						{ label: 'CLI Setup (CC Switch)', slug: 'getting-started/cli-setup' },
					],
				},
				{
					label: 'API Reference',
					items: [
						{ label: 'SystemOne', slug: 'api/systemone' },
						{ label: 'OpenAI Compatibility', slug: 'api/openai-compat' },
					],
				},
				{
					label: 'Harness',
					items: [{ label: 'Overview', slug: 'harness' }],
				},
			],
		}),
	],
});
