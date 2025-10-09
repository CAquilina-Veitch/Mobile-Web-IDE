/**
 * Editor Module
 * Manages Monaco Editor instance and file editing
 */

import { Storage } from './storage.js';

export class Editor {
    constructor(containerElement) {
        this.container = containerElement;
        this.editor = null;
        this.currentFile = null;
        this.currentContent = null;
        this.originalContent = null;
        this.isDirty = false;
        this.owner = null;
        this.repo = null;
        this.onDirtyStateChange = null;
    }

    /**
     * Initialize Monaco Editor
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            if (!window.monaco) {
                reject(new Error('Monaco editor not loaded'));
                return;
            }

            try {
                this.editor = monaco.editor.create(this.container, {
                    value: '// Select a file to start editing',
                    language: 'csharp',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    fontSize: 14,
                    lineNumbers: 'on',
                    minimap: {
                        enabled: false // Disable minimap on mobile
                    },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    wrappingIndent: 'same',
                    folding: true,
                    glyphMargin: false,
                    // Mobile optimizations
                    quickSuggestions: false,
                    parameterHints: { enabled: false },
                    suggestOnTriggerCharacters: false,
                    acceptSuggestionOnEnter: 'off',
                    tabCompletion: 'off',
                    wordBasedSuggestions: false
                });

                // Listen for content changes
                this.editor.onDidChangeModelContent(() => {
                    this.checkDirtyState();
                });

                // Add keyboard shortcuts
                this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                    this.save();
                });

                resolve(this.editor);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Load file content into editor
     */
    loadFile(filePath, content, sha, owner, repo) {
        this.currentFile = filePath;
        this.originalContent = content;
        this.currentContent = content;
        this.owner = owner;
        this.repo = repo;

        // Check for unsaved changes
        const unsaved = Storage.getUnsavedChanges(owner, repo, filePath);
        if (unsaved && unsaved.content) {
            this.currentContent = unsaved.content;
        }

        // Detect language
        const language = this.detectLanguage(filePath);

        // Set editor content
        if (this.editor) {
            const model = monaco.editor.createModel(this.currentContent, language);
            this.editor.setModel(model);
        }

        this.checkDirtyState();
    }

    /**
     * Detect language from file extension
     */
    detectLanguage(filePath) {
        const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

        const languageMap = {
            '.cs': 'csharp',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.json': 'json',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.md': 'markdown',
            '.txt': 'plaintext',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'cpp',
            '.sh': 'shell',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        };

        return languageMap[ext] || 'plaintext';
    }

    /**
     * Get current editor content
     */
    getContent() {
        if (!this.editor) return null;
        return this.editor.getValue();
    }

    /**
     * Check if content has changed (dirty state)
     */
    checkDirtyState() {
        const currentContent = this.getContent();
        const wasDirty = this.isDirty;
        this.isDirty = currentContent !== this.originalContent;

        if (wasDirty !== this.isDirty) {
            if (this.onDirtyStateChange) {
                this.onDirtyStateChange(this.isDirty);
            }
        }
    }

    /**
     * Save current file to localStorage
     */
    save() {
        if (!this.currentFile || !this.owner || !this.repo) {
            return false;
        }

        const content = this.getContent();
        Storage.setUnsavedChanges(this.owner, this.repo, this.currentFile, content);
        this.currentContent = content;

        return true;
    }

    /**
     * Discard changes and revert to original content
     */
    discard() {
        if (!this.currentFile || !this.owner || !this.repo) {
            return false;
        }

        // Clear unsaved changes
        Storage.clearUnsavedChanges(this.owner, this.repo, this.currentFile);

        // Revert editor content
        if (this.editor) {
            this.editor.setValue(this.originalContent);
        }

        this.currentContent = this.originalContent;
        this.checkDirtyState();

        return true;
    }

    /**
     * Mark file as committed (update original content)
     */
    markAsCommitted() {
        if (!this.currentFile || !this.owner || !this.repo) {
            return false;
        }

        const content = this.getContent();
        this.originalContent = content;
        this.currentContent = content;

        // Clear unsaved changes
        Storage.clearUnsavedChanges(this.owner, this.repo, this.currentFile);

        this.checkDirtyState();
        return true;
    }

    /**
     * Get current file info
     */
    getCurrentFile() {
        return {
            path: this.currentFile,
            isDirty: this.isDirty,
            content: this.getContent()
        };
    }

    /**
     * Clear editor
     */
    clear() {
        this.currentFile = null;
        this.originalContent = null;
        this.currentContent = null;
        this.isDirty = false;

        if (this.editor) {
            this.editor.setValue('// Select a file to start editing');
        }
    }

    /**
     * Focus editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        }
    }

    /**
     * Insert text at cursor position
     */
    insertText(text) {
        if (!this.editor) return;

        const selection = this.editor.getSelection();
        const op = {
            range: selection,
            text: text,
            forceMoveMarkers: true
        };

        this.editor.executeEdits('keyboard', [op]);
        this.editor.focus();
    }

    /**
     * Dispose editor
     */
    dispose() {
        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }
    }

    /**
     * Set dirty state change callback
     */
    setOnDirtyStateChange(callback) {
        this.onDirtyStateChange = callback;
    }

    /**
     * Check if editor has unsaved changes
     */
    isDirtyState() {
        return this.isDirty;
    }

    /**
     * Update layout (useful for responsive changes)
     */
    updateLayout() {
        if (this.editor) {
            this.editor.layout();
        }
    }
}

export default Editor;
