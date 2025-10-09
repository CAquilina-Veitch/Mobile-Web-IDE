/**
 * Storage Module
 * Manages localStorage operations for the GitHub Mobile IDE
 */

const STORAGE_KEYS = {
    AUTH_TOKEN: 'github_ide_auth_token',
    CURRENT_REPO: 'github_ide_current_repo',
    PINNED_FILES: 'github_ide_pinned_files',
    UNSAVED_CHANGES: 'github_ide_unsaved_changes',
    LAST_BRANCH: 'github_ide_last_branch',
    USER_INFO: 'github_ide_user_info'
};

export class Storage {
    /**
     * Save authentication token
     */
    static setAuthToken(token) {
        try {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
            return true;
        } catch (e) {
            console.error('Failed to save auth token:', e);
            return false;
        }
    }

    /**
     * Get authentication token
     */
    static getAuthToken() {
        try {
            return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        } catch (e) {
            console.error('Failed to get auth token:', e);
            return null;
        }
    }

    /**
     * Remove authentication token
     */
    static clearAuthToken() {
        try {
            localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            return true;
        } catch (e) {
            console.error('Failed to clear auth token:', e);
            return false;
        }
    }

    /**
     * Save current repository info
     */
    static setCurrentRepo(owner, repo) {
        try {
            localStorage.setItem(STORAGE_KEYS.CURRENT_REPO, JSON.stringify({ owner, repo }));
            return true;
        } catch (e) {
            console.error('Failed to save current repo:', e);
            return false;
        }
    }

    /**
     * Get current repository info
     */
    static getCurrentRepo() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.CURRENT_REPO);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get current repo:', e);
            return null;
        }
    }

    /**
     * Clear current repository
     */
    static clearCurrentRepo() {
        try {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_REPO);
            return true;
        } catch (e) {
            console.error('Failed to clear current repo:', e);
            return false;
        }
    }

    /**
     * Get pinned files for a specific repository
     */
    static getPinnedFiles(owner, repo) {
        try {
            const allPinned = localStorage.getItem(STORAGE_KEYS.PINNED_FILES);
            const pinnedData = allPinned ? JSON.parse(allPinned) : {};
            const repoKey = `${owner}/${repo}`;
            return pinnedData[repoKey] || [];
        } catch (e) {
            console.error('Failed to get pinned files:', e);
            return [];
        }
    }

    /**
     * Set pinned files for a specific repository
     */
    static setPinnedFiles(owner, repo, files) {
        try {
            const allPinned = localStorage.getItem(STORAGE_KEYS.PINNED_FILES);
            const pinnedData = allPinned ? JSON.parse(allPinned) : {};
            const repoKey = `${owner}/${repo}`;
            pinnedData[repoKey] = files;
            localStorage.setItem(STORAGE_KEYS.PINNED_FILES, JSON.stringify(pinnedData));
            return true;
        } catch (e) {
            console.error('Failed to set pinned files:', e);
            return false;
        }
    }

    /**
     * Add a pinned file
     */
    static addPinnedFile(owner, repo, filePath) {
        const pinned = this.getPinnedFiles(owner, repo);
        if (!pinned.includes(filePath)) {
            pinned.push(filePath);
            return this.setPinnedFiles(owner, repo, pinned);
        }
        return true;
    }

    /**
     * Remove a pinned file
     */
    static removePinnedFile(owner, repo, filePath) {
        const pinned = this.getPinnedFiles(owner, repo);
        const filtered = pinned.filter(p => p !== filePath);
        return this.setPinnedFiles(owner, repo, filtered);
    }

    /**
     * Check if a file is pinned
     */
    static isFilePinned(owner, repo, filePath) {
        const pinned = this.getPinnedFiles(owner, repo);
        return pinned.includes(filePath);
    }

    /**
     * Get unsaved changes for a specific file
     */
    static getUnsavedChanges(owner, repo, filePath) {
        try {
            const allChanges = localStorage.getItem(STORAGE_KEYS.UNSAVED_CHANGES);
            const changesData = allChanges ? JSON.parse(allChanges) : {};
            const fileKey = `${owner}/${repo}/${filePath}`;
            return changesData[fileKey] || null;
        } catch (e) {
            console.error('Failed to get unsaved changes:', e);
            return null;
        }
    }

    /**
     * Save unsaved changes for a specific file
     */
    static setUnsavedChanges(owner, repo, filePath, content) {
        try {
            const allChanges = localStorage.getItem(STORAGE_KEYS.UNSAVED_CHANGES);
            const changesData = allChanges ? JSON.parse(allChanges) : {};
            const fileKey = `${owner}/${repo}/${filePath}`;
            changesData[fileKey] = {
                content,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEYS.UNSAVED_CHANGES, JSON.stringify(changesData));
            return true;
        } catch (e) {
            console.error('Failed to save unsaved changes:', e);
            return false;
        }
    }

    /**
     * Clear unsaved changes for a specific file
     */
    static clearUnsavedChanges(owner, repo, filePath) {
        try {
            const allChanges = localStorage.getItem(STORAGE_KEYS.UNSAVED_CHANGES);
            const changesData = allChanges ? JSON.parse(allChanges) : {};
            const fileKey = `${owner}/${repo}/${filePath}`;
            delete changesData[fileKey];
            localStorage.setItem(STORAGE_KEYS.UNSAVED_CHANGES, JSON.stringify(changesData));
            return true;
        } catch (e) {
            console.error('Failed to clear unsaved changes:', e);
            return false;
        }
    }

    /**
     * Get all files with unsaved changes for a repository
     */
    static getAllUnsavedChanges(owner, repo) {
        try {
            const allChanges = localStorage.getItem(STORAGE_KEYS.UNSAVED_CHANGES);
            const changesData = allChanges ? JSON.parse(allChanges) : {};
            const prefix = `${owner}/${repo}/`;
            const repoChanges = {};

            for (const [key, value] of Object.entries(changesData)) {
                if (key.startsWith(prefix)) {
                    const filePath = key.substring(prefix.length);
                    repoChanges[filePath] = value;
                }
            }

            return repoChanges;
        } catch (e) {
            console.error('Failed to get all unsaved changes:', e);
            return {};
        }
    }

    /**
     * Save last used branch for a repository
     */
    static setLastBranch(owner, repo, branch) {
        try {
            const allBranches = localStorage.getItem(STORAGE_KEYS.LAST_BRANCH);
            const branchData = allBranches ? JSON.parse(allBranches) : {};
            const repoKey = `${owner}/${repo}`;
            branchData[repoKey] = branch;
            localStorage.setItem(STORAGE_KEYS.LAST_BRANCH, JSON.stringify(branchData));
            return true;
        } catch (e) {
            console.error('Failed to save last branch:', e);
            return false;
        }
    }

    /**
     * Get last used branch for a repository
     */
    static getLastBranch(owner, repo) {
        try {
            const allBranches = localStorage.getItem(STORAGE_KEYS.LAST_BRANCH);
            const branchData = allBranches ? JSON.parse(allBranches) : {};
            const repoKey = `${owner}/${repo}`;
            return branchData[repoKey] || null;
        } catch (e) {
            console.error('Failed to get last branch:', e);
            return null;
        }
    }

    /**
     * Save user info
     */
    static setUserInfo(userInfo) {
        try {
            localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
            return true;
        } catch (e) {
            console.error('Failed to save user info:', e);
            return false;
        }
    }

    /**
     * Get user info
     */
    static getUserInfo() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.USER_INFO);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get user info:', e);
            return null;
        }
    }

    /**
     * Clear all stored data (logout)
     */
    static clearAll() {
        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Failed to clear all data:', e);
            return false;
        }
    }

    /**
     * Get storage usage estimate
     */
    static getStorageUsage() {
        try {
            let total = 0;
            for (const key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            // Return size in KB
            return (total / 1024).toFixed(2);
        } catch (e) {
            console.error('Failed to get storage usage:', e);
            return 0;
        }
    }
}

export default Storage;
