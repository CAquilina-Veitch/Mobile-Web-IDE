/**
 * GitHub API Module
 * Direct fetch wrapper for GitHub REST API
 */

import { Storage } from './storage.js';

export class GitHubAPI {
    constructor(token) {
        this.token = token;
        this.baseUrl = 'https://api.github.com';
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Make authenticated GitHub API request
     */
    async request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Cache helper
     */
    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data;
        }
        return null;
    }

    _setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get authenticated user info
     */
    async getAuthenticatedUser() {
        try {
            return await this.request('/user');
        } catch (error) {
            console.error('Failed to get authenticated user:', error);
            throw error;
        }
    }

    /**
     * Get user repositories
     */
    async getUserRepos(page = 1, perPage = 100) {
        try {
            const cacheKey = `repos_${page}_${perPage}`;
            const cached = this._getFromCache(cacheKey);
            if (cached) return cached;

            const data = await this.request(`/user/repos?page=${page}&per_page=${perPage}&sort=updated&affiliation=owner,collaborator`);

            this._setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get user repos:', error);
            throw error;
        }
    }

    /**
     * Get repository branches
     */
    async getBranches(owner, repo) {
        try {
            const cacheKey = `branches_${owner}_${repo}`;
            const cached = this._getFromCache(cacheKey);
            if (cached) return cached;

            const data = await this.request(`/repos/${owner}/${repo}/branches`);

            this._setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get branches:', error);
            throw error;
        }
    }

    /**
     * Get default branch
     */
    async getDefaultBranch(owner, repo) {
        try {
            const data = await this.request(`/repos/${owner}/${repo}`);
            return data.default_branch;
        } catch (error) {
            console.error('Failed to get default branch:', error);
            throw error;
        }
    }

    /**
     * Create a new branch
     */
    async createBranch(owner, repo, newBranch, fromBranch) {
        try {
            // Get the SHA of the from branch
            const refData = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${fromBranch}`);

            // Create new branch
            const data = await this.request(`/repos/${owner}/${repo}/git/refs`, {
                method: 'POST',
                body: JSON.stringify({
                    ref: `refs/heads/${newBranch}`,
                    sha: refData.object.sha
                })
            });

            // Clear branches cache
            const cacheKey = `branches_${owner}_${repo}`;
            this.cache.delete(cacheKey);

            return data;
        } catch (error) {
            console.error('Failed to create branch:', error);
            throw error;
        }
    }

    /**
     * Get repository tree (file structure)
     */
    async getTree(owner, repo, branch = 'main', recursive = true) {
        try {
            const cacheKey = `tree_${owner}_${repo}_${branch}`;
            const cached = this._getFromCache(cacheKey);
            if (cached) return cached;

            // Get branch reference
            const refData = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);

            // Get tree
            const data = await this.request(`/repos/${owner}/${repo}/git/trees/${refData.object.sha}?recursive=${recursive ? 1 : 0}`);

            this._setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('Failed to get tree:', error);
            throw error;
        }
    }

    /**
     * Get file content
     */
    async getFileContent(owner, repo, path, branch = 'main') {
        try {
            const data = await this.request(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);

            // Decode base64 content
            if (data.content) {
                data.decodedContent = atob(data.content.replace(/\n/g, ''));
            }

            return data;
        } catch (error) {
            console.error('Failed to get file content:', error);
            throw error;
        }
    }

    /**
     * Update file content (commit)
     */
    async updateFile(owner, repo, path, content, message, branch, sha) {
        try {
            const data = await this.request(`/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                body: JSON.stringify({
                    message,
                    content: btoa(unescape(encodeURIComponent(content))),
                    branch,
                    sha
                })
            });

            // Clear tree cache
            const cacheKey = `tree_${owner}_${repo}_${branch}`;
            this.cache.delete(cacheKey);

            return data;
        } catch (error) {
            console.error('Failed to update file:', error);
            throw error;
        }
    }

    /**
     * Create a new file
     */
    async createNewFile(owner, repo, path, content, message, branch) {
        try {
            const data = await this.request(`/repos/${owner}/${repo}/contents/${path}`, {
                method: 'PUT',
                body: JSON.stringify({
                    message,
                    content: btoa(unescape(encodeURIComponent(content))),
                    branch
                })
            });

            // Clear tree cache
            const cacheKey = `tree_${owner}_${repo}_${branch}`;
            this.cache.delete(cacheKey);

            return data;
        } catch (error) {
            console.error('Failed to create new file:', error);
            throw error;
        }
    }

    /**
     * Create or update multiple files in a single commit
     */
    async commitMultipleFiles(owner, repo, branch, files, message) {
        try {
            // Get current commit SHA
            const refData = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
            const currentCommitSha = refData.object.sha;

            // Get current commit tree
            const commitData = await this.request(`/repos/${owner}/${repo}/git/commits/${currentCommitSha}`);
            const currentTreeSha = commitData.tree.sha;

            // Create blobs for each file
            const blobs = await Promise.all(
                files.map(async (file) => {
                    const blob = await this.request(`/repos/${owner}/${repo}/git/blobs`, {
                        method: 'POST',
                        body: JSON.stringify({
                            content: btoa(unescape(encodeURIComponent(file.content))),
                            encoding: 'base64'
                        })
                    });
                    return {
                        path: file.path,
                        mode: '100644',
                        type: 'blob',
                        sha: blob.sha
                    };
                })
            );

            // Create new tree
            const newTree = await this.request(`/repos/${owner}/${repo}/git/trees`, {
                method: 'POST',
                body: JSON.stringify({
                    base_tree: currentTreeSha,
                    tree: blobs
                })
            });

            // Create new commit
            const newCommit = await this.request(`/repos/${owner}/${repo}/git/commits`, {
                method: 'POST',
                body: JSON.stringify({
                    message,
                    tree: newTree.sha,
                    parents: [currentCommitSha]
                })
            });

            // Update reference
            await this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    sha: newCommit.sha
                })
            });

            // Clear cache
            const cacheKey = `tree_${owner}_${repo}_${branch}`;
            this.cache.delete(cacheKey);

            return newCommit;
        } catch (error) {
            console.error('Failed to commit multiple files:', error);
            throw error;
        }
    }

    /**
     * Get commits ahead/behind count
     */
    async compareCommits(owner, repo, base, head) {
        try {
            const data = await this.request(`/repos/${owner}/${repo}/compare/${base}...${head}`);
            return {
                ahead: data.ahead_by,
                behind: data.behind_by,
                status: data.status
            };
        } catch (error) {
            console.error('Failed to compare commits:', error);
            throw error;
        }
    }

    /**
     * Get rate limit status
     */
    async getRateLimit() {
        try {
            const data = await this.request('/rate_limit');
            return {
                limit: data.rate.limit,
                remaining: data.rate.remaining,
                reset: new Date(data.rate.reset * 1000)
            };
        } catch (error) {
            console.error('Failed to get rate limit:', error);
            return null;
        }
    }

    /**
     * Check if file is binary
     */
    isBinaryFile(path) {
        const binaryExtensions = [
            '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
            '.mp3', '.mp4', '.avi', '.mov', '.wav',
            '.zip', '.tar', '.gz', '.rar', '.7z',
            '.exe', '.dll', '.so', '.dylib',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx',
            '.psd', '.ai', '.sketch'
        ];

        const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
        return binaryExtensions.includes(ext);
    }

    /**
     * Check if file is too large (>1MB)
     */
    isFileTooLarge(size) {
        return size > 1024 * 1024; // 1MB
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
    }
}

export default GitHubAPI;
