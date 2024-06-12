import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface ReadwisePluginSettings {
	apiToken: string;
}

const DEFAULT_SETTINGS: ReadwisePluginSettings = {
	apiToken: ''
}

export default class ReadwisePlugin extends Plugin {
	settings: ReadwisePluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('highlight', 'Highlight to Readwise', () => {
			new Notice('Highlight to Readwise');
		});

		this.addCommand({
			id: 'highlight-to-readwise',
			name: 'Highlight to Readwise',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.highlightAndSend(editor, view);
			}
		});

		this.addSettingTab(new ReadwiseSettingTab(this.app, this));
	}

	async highlightAndSend(editor: Editor, view: MarkdownView) {
		const selectedText = editor.getSelection();

		if (!selectedText) {
			new Notice('No text selected');
			return;
		}

		new ReadwiseModal(this.app, async (details) => {
			const highlight = {
				text: selectedText,
				title: details.title,
				author: details.author,
				category: details.category
			};

			try {
				const response = await fetch('https://readwise.io/api/v2/highlights/', {
					method: 'POST',
					headers: {
						'Authorization': `Token ${this.settings.apiToken}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ highlights: [highlight] })
				});

				if (response.ok) {
					new Notice('Highlight sent to Readwise');
				} else {
					new Notice('Failed to send highlight to Readwise');
				}
			} catch (error) {
				new Notice('Failed to send highlight to Readwise');
			}
		}).open();
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ReadwiseModal extends Modal {
	onSubmit: (details: { title: string, author: string, category: string }) => void;

	constructor(app: App, onSubmit: (details: { title: string, author: string, category: string }) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Highlight Details' });

		const titleInput = contentEl.createEl('input', { type: 'text', placeholder: 'Title' });
		const authorInput = contentEl.createEl('input', { type: 'text', placeholder: 'Author' });
		const categoryInput = contentEl.createEl('input', { type: 'text', placeholder: 'Category (books, articles, tweets, podcasts)' });

		contentEl.createEl('button', { text: 'Submit' }).addEventListener('click', () => {
			this.onSubmit({
				title: titleInput.value,
				author: authorInput.value,
				category: categoryInput.value
			});
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ReadwiseSettingTab extends PluginSettingTab {
	plugin: ReadwisePlugin;

	constructor(app: App, plugin: ReadwisePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Readwise Plugin Settings' });

		new Setting(containerEl)
			.setName('API Token')
			.setDesc('Enter your Readwise API token')
			.addText(text => text
				.setPlaceholder('Enter your API token')
				.setValue(this.plugin.settings.apiToken)
				.onChange(async (value) => {
					this.plugin.settings.apiToken = value;
					await this.plugin.saveSettings();
				}));
	}
}

