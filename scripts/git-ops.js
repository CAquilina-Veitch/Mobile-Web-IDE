/**
 * Git Operations Module
 * Handles commit, push, pull operations via GitHub API
 */

import { Storage } from './storage.js';

export class GitOps {
    constructor(githubAPI, owner, repo) {
        this.api = githubAPI;
        this.owner = owner;
        this.repo = repo;
        this.currentBranch = null;
    }

    /**
     * Set current branch
     */
    setCurrentBranch(branch) {
        this.currentBranch = branch;
    }

    /**
     * Get all files with unsaved changes
     */
    getUnsavedChanges() {
        return Storage.getAllUnsavedChanges(this.owner, this.repo);
    }

    /**
     * Commit single file
     */
    async commitFile(filePath, content, message, sha) {
        try {
            if (!this.currentBranch) {
                throw new Error('No branch selected');
            }

            const result = await this.api.updateFile(
                this.owner,
                this.repo,
                filePath,
                content,
                message,
                this.currentBranch,
                sha
            );

            // Clear unsaved changes for this file
            Storage.clearUnsavedChanges(this.owner, this.repo, filePath);

            return result;
        } catch (error) {
            console.error('Failed to commit file:', error);
            throw error;
        }
    }

    /**
     * Commit multiple files at once
     */
    async commitMultipleFiles(files, message) {
        try {
            if (!this.currentBranch) {
                throw new Error('No branch selected');
            }

            if (files.length === 0) {
                throw new Error('No files to commit');
            }

            const result = await this.api.commitMultipleFiles(
                this.owner,
                this.repo,
                this.currentBranch,
                files,
                message
            );

            // Clear unsaved changes for all committed files
            files.forEach(file => {
                Storage.clearUnsavedChanges(this.owner, this.repo, file.path);
            });

            return result;
        } catch (error) {
            console.error('Failed to commit multiple files:', error);
            throw error;
        }
    }

    /**
     * Commit all unsaved changes
     */
    async commitAllChanges(message) {
        try {
            const unsavedChanges = this.getUnsavedChanges();
            const filePaths = Object.keys(unsavedChanges);

            if (filePaths.length === 0) {
                throw new Error('No unsaved changes to commit');
            }

            // Prepare files array for commit
            const files = filePaths.map(path => ({
                path: path,
                content: unsavedChanges[path].content
            }));

            return await this.commitMultipleFiles(files, message);
        } catch (error) {
            console.error('Failed to commit all changes:', error);
            throw error;
        }
    }

    /**
     * Pull latest changes from remote
     * Note: For a real implementation, we'd need to handle merge conflicts
     * This is a simplified version that just reloads the tree
     */
    async pull() {
        try {
            if (!this.currentBranch) {
                throw new Error('No branch selected');
            }

            // Check for local unsaved changes
            const unsavedChanges = this.getUnsavedChanges();
            const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

            if (hasUnsavedChanges) {
                throw new Error('Cannot pull: You have unsaved changes. Please commit or discard them first.');
            }

            // Clear cache to force fresh data
            this.api.clearCache();

            // Fetch latest tree
            const tree = await this.api.getTree(this.owner, this.repo, this.currentBranch);

            return {
                success: true,
                message: 'Pulled latest changes successfully',
                tree: tree
            };
        } catch (error) {
            console.error('Failed to pull:', error);
            throw error;
        }
    }

    /**
     * Push changes (for GitHub API, commits are automatically pushed)
     * This is more of a status check
     */
    async push() {
        try {
            if (!this.currentBranch) {
                throw new Error('No branch selected');
            }

            // Check if there are uncommitted changes
            const unsavedChanges = this.getUnsavedChanges();
            const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

            if (hasUnsavedChanges) {
                throw new Error('Cannot push: You have uncommitted changes. Please commit them first.');
            }

            // Since GitHub API commits are automatically pushed,
            // we just return success
            return {
                success: true,
                message: 'All changes are already pushed to remote'
            };
        } catch (error) {
            console.error('Push failed:', error);
            throw error;
        }
    }

    /**
     * Get commit status (ahead/behind remote)
     * Note: For GitHub API, we're always in sync since commits are immediate
     */
    async getCommitStatus() {
        try {
            if (!this.currentBranch) {
                return null;
            }

            // Check for unsaved/uncommitted changes
            const unsavedChanges = this.getUnsavedChanges();
            const uncommittedCount = Object.keys(unsavedChanges).length;

            return {
                uncommitted: uncommittedCount,
                ahead: 0, // GitHub API commits are immediate
                behind: 0
            };
        } catch (error) {
            console.error('Failed to get commit status:', error);
            return null;
        }
    }

    /**
     * Discard changes for a specific file
     */
    async discardFileChanges(filePath) {
        try {
            Storage.clearUnsavedChanges(this.owner, this.repo, filePath);
            return true;
        } catch (error) {
            console.error('Failed to discard file changes:', error);
            throw error;
        }
    }

    /**
     * Discard all unsaved changes
     */
    async discardAllChanges() {
        try {
            const unsavedChanges = this.getUnsavedChanges();
            const filePaths = Object.keys(unsavedChanges);

            filePaths.forEach(path => {
                Storage.clearUnsavedChanges(this.owner, this.repo, path);
            });

            return true;
        } catch (error) {
            console.error('Failed to discard all changes:', error);
            throw error;
        }
    }

    /**
     * Get file SHA (needed for updates)
     */
    async getFileSha(filePath, branch) {
        try {
            const fileData = await this.api.getFileContent(
                this.owner,
                this.repo,
                filePath,
                branch || this.currentBranch
            );
            return fileData.sha;
        } catch (error) {
            console.error('Failed to get file SHA:', error);
            throw error;
        }
    }

    /**
     * Check if there are uncommitted changes
     */
    hasUncommittedChanges() {
        const unsavedChanges = this.getUnsavedChanges();
        return Object.keys(unsavedChanges).length > 0;
    }

    /**
     * Get list of changed files with details
     */
    getChangedFilesList() {
        const unsavedChanges = this.getUnsavedChanges();
        return Object.keys(unsavedChanges).map(path => ({
            path: path,
            timestamp: unsavedChanges[path].timestamp,
            timestampFormatted: new Date(unsavedChanges[path].timestamp).toLocaleString()
        }));
    }
}

export default GitOps;
