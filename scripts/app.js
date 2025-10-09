/**
 * Main Application Controller
 * Orchestrates all modules and manages application state
 */

import { Auth } from './auth.js';
import { Storage } from './storage.js';
import { GitHubAPI } from './github-api.js';
import { FileTree } from './file-tree.js';
import { Editor } from './editor.js';
import { GitOps } from './git-ops.js';

class App {
    constructor() {
        // Module instances
        this.auth = new Auth();
        this.githubAPI = null;
        this.fileTree = null;
        this.editor = null;
        this.gitOps = null;

        // Application state
        this.currentRepo = null;
        this.currentBranch = null;
        this.currentFile = null;
        this.currentFileSha = null;
        this.pinnedFiles = [];

        // UI Elements
        this.elements = {
            // Screens
            loginScreen: document.getElementById('login-screen'),
            repoScreen: document.getElementById('repo-screen'),
            ideScreen: document.getElementById('ide-screen'),

            // Login
            loginBtn: document.getElementById('login-btn'),
            deviceFlowInfo: document.getElementById('device-flow-info'),
            userCode: document.getElementById('user-code'),
            verificationUrl: document.getElementById('verification-url'),

            // Repo selection
            repoSearch: document.getElementById('repo-search'),
            repoList: document.getElementById('repo-list'),
            logoutBtn: document.getElementById('logout-btn'),

            // IDE
            menuToggle: document.getElementById('menu-toggle'),
            fileTreeDrawer: document.getElementById('file-tree-drawer'),
            fileSearch: document.getElementById('file-search'),
            fileTreeContainer: document.getElementById('file-tree'),
            branchSelector: document.getElementById('branch-selector'),
            newBranchBtn: document.getElementById('new-branch-btn'),
            currentFileLabel: document.getElementById('current-file'),
            editorContainer: document.getElementById('editor-container'),
            pinnedTabs: document.getElementById('pinned-tabs'),
            pinBtn: document.getElementById('pin-btn'),
            saveBtn: document.getElementById('save-btn'),
            discardBtn: document.getElementById('discard-btn'),
            commitBtn: document.getElementById('commit-btn'),
            pushBtn: document.getElementById('push-btn'),
            pullBtn: document.getElementById('pull-btn'),
            ideLogoutBtn: document.getElementById('ide-logout-btn'),

            // Modals
            commitModal: document.getElementById('commit-modal'),
            changedFilesList: document.getElementById('changed-files-list'),
            commitMessage: document.getElementById('commit-message'),
            confirmCommitBtn: document.getElementById('confirm-commit-btn'),
            cancelCommitBtn: document.getElementById('cancel-commit-btn'),
            branchModal: document.getElementById('branch-modal'),
            newBranchName: document.getElementById('new-branch-name'),
            currentBranchName: document.getElementById('current-branch-name'),
            createBranchBtn: document.getElementById('create-branch-btn'),
            cancelBranchBtn: document.getElementById('cancel-branch-btn'),

            // Loading
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            toastContainer: document.getElementById('toast-container'),
            statusText: document.getElementById('status-text'),
            rateLimitStatus: document.getElementById('rate-limit-status')
        };

        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        this.setupEventListeners();
        this.setupKeyboardToolbar();

        // Check if already authenticated
        if (this.auth.isAuthenticated()) {
            await this.handleAuthenticatedUser();
        } else {
            this.showScreen('login');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Login
        this.elements.loginBtn.addEventListener('click', () => this.handleLogin());

        // Repo selection
        this.elements.repoSearch.addEventListener('input', (e) => this.filterRepos(e.target.value));
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());

        // IDE
        this.elements.menuToggle.addEventListener('click', () => this.toggleFileTreeDrawer());
        this.elements.fileSearch.addEventListener('input', (e) => this.filterFiles(e.target.value));
        this.elements.branchSelector.addEventListener('change', (e) => this.switchBranch(e.target.value));
        this.elements.newBranchBtn.addEventListener('click', () => this.showNewBranchModal());
        this.elements.pinBtn.addEventListener('click', () => this.togglePinCurrentFile());
        this.elements.saveBtn.addEventListener('click', () => this.saveCurrentFile());
        this.elements.discardBtn.addEventListener('click', () => this.discardCurrentFile());
        this.elements.commitBtn.addEventListener('click', () => this.showCommitModal());
        this.elements.pushBtn.addEventListener('click', () => this.handlePush());
        this.elements.pullBtn.addEventListener('click', () => this.handlePull());
        this.elements.ideLogoutBtn.addEventListener('click', () => this.handleLogout());

        // Commit modal
        this.elements.confirmCommitBtn.addEventListener('click', () => this.handleCommit());
        this.elements.cancelCommitBtn.addEventListener('click', () => this.hideModal('commit-modal'));

        // Branch modal
        this.elements.createBranchBtn.addEventListener('click', () => this.handleCreateBranch());
        this.elements.cancelBranchBtn.addEventListener('click', () => this.hideModal('branch-modal'));

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.target.dataset.modal;
                this.hideModal(modalId);
            });
        });

        // Close modals on outside click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });
    }

    /**
     * Setup keyboard toolbar
     */
    setupKeyboardToolbar() {
        const toolbar = document.getElementById('keyboard-toolbar');
        toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('toolbar-key')) {
                const key = e.target.dataset.key;
                if (key === 'Tab') {
                    this.editor.insertText('    '); // 4 spaces
                } else {
                    this.editor.insertText(key);
                }
            }
        });
    }

    /**
     * Handle login
     */
    async handleLogin() {
        this.elements.loginBtn.disabled = true;

        try {
            await this.auth.login((deviceCodeInfo) => {
                // Show device code
                this.elements.deviceFlowInfo.classList.remove('hidden');
                this.elements.userCode.textContent = deviceCodeInfo.userCode;
                this.elements.verificationUrl.href = deviceCodeInfo.verificationUri;
                this.elements.verificationUrl.textContent = deviceCodeInfo.verificationUri;
            });

            // Login successful
            await this.handleAuthenticatedUser();
        } catch (error) {
            this.showToast('Login failed: ' + error.message, 'error');
            this.elements.loginBtn.disabled = false;
            this.elements.deviceFlowInfo.classList.add('hidden');
        }
    }

    /**
     * Handle authenticated user
     */
    async handleAuthenticatedUser() {
        this.showLoading('Loading...');

        try {
            const token = this.auth.getToken();
            this.githubAPI = new GitHubAPI(token);

            // Get user info
            const userInfo = await this.githubAPI.getAuthenticatedUser();
            Storage.setUserInfo(userInfo);

            // Check if we have a saved repo
            const savedRepo = Storage.getCurrentRepo();
            if (savedRepo) {
                await this.loadRepository(savedRepo.owner, savedRepo.repo);
            } else {
                await this.showRepoSelection();
            }
        } catch (error) {
            this.showToast('Failed to load user data: ' + error.message, 'error');
            this.handleLogout();
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Show repository selection
     */
    async showRepoSelection() {
        this.showLoading('Loading repositories...');

        try {
            const repos = await this.githubAPI.getUserRepos();
            this.renderRepoList(repos);
            this.showScreen('repo');
        } catch (error) {
            this.showToast('Failed to load repositories: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Render repository list
     */
    renderRepoList(repos) {
        this.allRepos = repos;
        this.elements.repoList.innerHTML = '';

        repos.forEach(repo => {
            const item = document.createElement('div');
            item.className = 'repo-item';
            item.innerHTML = `
                <h3>${repo.full_name}</h3>
                <p>${repo.description || 'No description'}</p>
            `;
            item.addEventListener('click', () => {
                this.loadRepository(repo.owner.login, repo.name);
            });
            this.elements.repoList.appendChild(item);
        });
    }

    /**
     * Filter repositories
     */
    filterRepos(query) {
        if (!this.allRepos) return;

        const filtered = this.allRepos.filter(repo =>
            repo.name.toLowerCase().includes(query.toLowerCase()) ||
            repo.full_name.toLowerCase().includes(query.toLowerCase()) ||
            (repo.description && repo.description.toLowerCase().includes(query.toLowerCase()))
        );

        this.renderRepoList(filtered);
    }

    /**
     * Load repository
     */
    async loadRepository(owner, repo) {
        this.showLoading('Loading repository...');

        try {
            // Save current repo
            Storage.setCurrentRepo(owner, repo);
            this.currentRepo = { owner, repo };

            // Initialize Git Operations
            this.gitOps = new GitOps(this.githubAPI, owner, repo);

            // Get branches
            const branches = await this.githubAPI.getBranches(owner, repo);
            const defaultBranch = await this.githubAPI.getDefaultBranch(owner, repo);

            // Check for saved branch
            const savedBranch = Storage.getLastBranch(owner, repo) || defaultBranch;
            this.currentBranch = savedBranch;
            this.gitOps.setCurrentBranch(savedBranch);

            // Populate branch selector
            this.populateBranchSelector(branches, savedBranch);

            // Load file tree
            await this.loadFileTree();

            // Initialize editor
            await this.initializeEditor();

            // Load pinned files
            this.loadPinnedFiles();

            // Show IDE
            this.showScreen('ide');

            this.updateStatusBar();
        } catch (error) {
            this.showToast('Failed to load repository: ' + error.message, 'error');
            this.showScreen('repo');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Populate branch selector
     */
    populateBranchSelector(branches, selected) {
        this.elements.branchSelector.innerHTML = '';

        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.name;
            option.textContent = branch.name;
            if (branch.name === selected) {
                option.selected = true;
            }
            this.elements.branchSelector.appendChild(option);
        });
    }

    /**
     * Load file tree
     */
    async loadFileTree() {
        this.showLoading('Loading files...');

        try {
            const tree = await this.githubAPI.getTree(
                this.currentRepo.owner,
                this.currentRepo.repo,
                this.currentBranch,
                true
            );

            // Initialize file tree if not already done
            if (!this.fileTree) {
                this.fileTree = new FileTree(
                    this.elements.fileTreeContainer,
                    (filePath) => this.handleFileSelect(filePath)
                );
            }

            this.fileTree.buildTree(tree);
            this.fileTree.render();
        } catch (error) {
            this.showToast('Failed to load files: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Initialize editor
     */
    async initializeEditor() {
        if (this.editor) return;

        try {
            this.editor = new Editor(this.elements.editorContainer);
            await this.editor.initialize();

            // Set dirty state change callback
            this.editor.setOnDirtyStateChange((isDirty) => {
                if (isDirty) {
                    this.elements.currentFileLabel.classList.add('dirty');
                } else {
                    this.elements.currentFileLabel.classList.remove('dirty');
                }
                this.updateStatusBar();
            });
        } catch (error) {
            this.showToast('Failed to initialize editor: ' + error.message, 'error');
        }
    }

    /**
     * Handle file selection
     */
    async handleFileSelect(filePath) {
        this.showLoading('Loading file...');

        try {
            // Check if binary
            if (this.githubAPI.isBinaryFile(filePath)) {
                this.showToast('Cannot open binary files', 'error');
                return;
            }

            // Get file content
            const fileData = await this.githubAPI.getFileContent(
                this.currentRepo.owner,
                this.currentRepo.repo,
                filePath,
                this.currentBranch
            );

            // Check if too large
            if (this.githubAPI.isFileTooLarge(fileData.size)) {
                this.showToast('File is too large (>1MB)', 'error');
                return;
            }

            // Load into editor
            this.currentFile = filePath;
            this.currentFileSha = fileData.sha;
            this.editor.loadFile(
                filePath,
                fileData.decodedContent,
                fileData.sha,
                this.currentRepo.owner,
                this.currentRepo.repo
            );

            // Update UI
            this.elements.currentFileLabel.textContent = filePath;
            this.updatePinButton();

            // Close drawer on mobile
            if (window.innerWidth < 768) {
                this.closeFileTreeDrawer();
            }
        } catch (error) {
            this.showToast('Failed to load file: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Switch branch
     */
    async switchBranch(branch) {
        if (branch === this.currentBranch) return;

        // Check for unsaved changes
        if (this.gitOps.hasUncommittedChanges()) {
            if (!confirm('You have uncommitted changes. Switch branch anyway?')) {
                this.elements.branchSelector.value = this.currentBranch;
                return;
            }
        }

        this.currentBranch = branch;
        this.gitOps.setCurrentBranch(branch);
        Storage.setLastBranch(this.currentRepo.owner, this.currentRepo.repo, branch);

        await this.loadFileTree();
        this.editor.clear();
        this.currentFile = null;
        this.elements.currentFileLabel.textContent = 'No file open';

        this.showToast(`Switched to branch: ${branch}`, 'success');
    }

    /**
     * Show new branch modal
     */
    showNewBranchModal() {
        this.elements.currentBranchName.textContent = this.currentBranch;
        this.elements.newBranchName.value = '';
        this.showModal('branch-modal');
    }

    /**
     * Handle create branch
     */
    async handleCreateBranch() {
        const newBranch = this.elements.newBranchName.value.trim();

        if (!newBranch) {
            this.showToast('Please enter a branch name', 'error');
            return;
        }

        this.showLoading('Creating branch...');
        this.hideModal('branch-modal');

        try {
            await this.githubAPI.createBranch(
                this.currentRepo.owner,
                this.currentRepo.repo,
                newBranch,
                this.currentBranch
            );

            // Refresh branches
            const branches = await this.githubAPI.getBranches(
                this.currentRepo.owner,
                this.currentRepo.repo
            );
            this.populateBranchSelector(branches, newBranch);

            // Switch to new branch
            this.currentBranch = newBranch;
            this.gitOps.setCurrentBranch(newBranch);
            Storage.setLastBranch(this.currentRepo.owner, this.currentRepo.repo, newBranch);

            this.showToast(`Created and switched to branch: ${newBranch}`, 'success');
        } catch (error) {
            this.showToast('Failed to create branch: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Save current file
     */
    saveCurrentFile() {
        if (!this.currentFile) {
            this.showToast('No file open', 'error');
            return;
        }

        this.editor.save();
        this.showToast('Saved locally', 'success');
        this.updateStatusBar();
    }

    /**
     * Discard current file changes
     */
    discardCurrentFile() {
        if (!this.currentFile) {
            this.showToast('No file open', 'error');
            return;
        }

        if (!confirm('Discard all changes to this file?')) {
            return;
        }

        this.editor.discard();
        this.showToast('Changes discarded', 'info');
        this.updateStatusBar();
    }

    /**
     * Show commit modal
     */
    showCommitModal() {
        const changedFiles = this.gitOps.getChangedFilesList();

        if (changedFiles.length === 0) {
            this.showToast('No changes to commit', 'info');
            return;
        }

        // Populate changed files list
        this.elements.changedFilesList.innerHTML = '';
        changedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'changed-file-item';
            item.textContent = `📝 ${file.path}`;
            this.elements.changedFilesList.appendChild(item);
        });

        this.elements.commitMessage.value = '';
        this.showModal('commit-modal');
    }

    /**
     * Handle commit
     */
    async handleCommit() {
        const message = this.elements.commitMessage.value.trim();

        if (!message) {
            this.showToast('Please enter a commit message', 'error');
            return;
        }

        this.showLoading('Committing...');
        this.hideModal('commit-modal');

        try {
            await this.gitOps.commitAllChanges(message);

            // Mark current file as committed
            if (this.currentFile) {
                this.editor.markAsCommitted();
            }

            this.showToast('Changes committed successfully', 'success');
            this.updateStatusBar();

            // Reload tree to get updated SHAs
            await this.loadFileTree();
        } catch (error) {
            this.showToast('Commit failed: ' + error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle push
     */
    async handlePush() {
        this.showLoading('Pushing...');

        try {
            await this.gitOps.push();
            this.showToast('All changes pushed', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle pull
     */
    async handlePull() {
        this.showLoading('Pulling...');

        try {
            const result = await this.gitOps.pull();
            await this.loadFileTree();

            // Clear current file if open
            if (this.currentFile) {
                this.editor.clear();
                this.currentFile = null;
                this.elements.currentFileLabel.textContent = 'No file open';
            }

            this.showToast(result.message, 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load pinned files
     */
    loadPinnedFiles() {
        this.pinnedFiles = Storage.getPinnedFiles(
            this.currentRepo.owner,
            this.currentRepo.repo
        );
        this.renderPinnedTabs();
    }

    /**
     * Render pinned tabs
     */
    renderPinnedTabs() {
        this.elements.pinnedTabs.innerHTML = '';

        this.pinnedFiles.forEach(filePath => {
            const tab = document.createElement('div');
            tab.className = 'pinned-tab';
            if (filePath === this.currentFile) {
                tab.classList.add('active');
            }

            const fileName = filePath.split('/').pop();
            tab.innerHTML = `
                <span>${fileName}</span>
                <button class="pinned-tab-close" data-path="${filePath}">&times;</button>
            `;

            tab.addEventListener('click', (e) => {
                if (!e.target.classList.contains('pinned-tab-close')) {
                    this.handleFileSelect(filePath);
                }
            });

            tab.querySelector('.pinned-tab-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.unpinFile(filePath);
            });

            this.elements.pinnedTabs.appendChild(tab);
        });
    }

    /**
     * Toggle pin current file
     */
    togglePinCurrentFile() {
        if (!this.currentFile) {
            this.showToast('No file open', 'error');
            return;
        }

        const isPinned = Storage.isFilePinned(
            this.currentRepo.owner,
            this.currentRepo.repo,
            this.currentFile
        );

        if (isPinned) {
            this.unpinFile(this.currentFile);
        } else {
            this.pinFile(this.currentFile);
        }
    }

    /**
     * Pin file
     */
    pinFile(filePath) {
        Storage.addPinnedFile(
            this.currentRepo.owner,
            this.currentRepo.repo,
            filePath
        );
        this.loadPinnedFiles();
        this.updatePinButton();
        this.showToast('File pinned', 'success');
    }

    /**
     * Unpin file
     */
    unpinFile(filePath) {
        Storage.removePinnedFile(
            this.currentRepo.owner,
            this.currentRepo.repo,
            filePath
        );
        this.loadPinnedFiles();
        this.updatePinButton();
        this.showToast('File unpinned', 'info');
    }

    /**
     * Update pin button state
     */
    updatePinButton() {
        if (!this.currentFile) return;

        const isPinned = Storage.isFilePinned(
            this.currentRepo.owner,
            this.currentRepo.repo,
            this.currentFile
        );

        this.elements.pinBtn.textContent = isPinned ? '📌' : '📍';
        this.elements.pinBtn.title = isPinned ? 'Unpin file' : 'Pin file';
    }

    /**
     * Filter files
     */
    filterFiles(query) {
        if (this.fileTree) {
            this.fileTree.setFilter(query);
        }
    }

    /**
     * Toggle file tree drawer
     */
    toggleFileTreeDrawer() {
        this.elements.fileTreeDrawer.classList.toggle('closed');
    }

    /**
     * Close file tree drawer
     */
    closeFileTreeDrawer() {
        this.elements.fileTreeDrawer.classList.add('closed');
    }

    /**
     * Update status bar
     */
    async updateStatusBar() {
        if (!this.gitOps) return;

        const status = await this.gitOps.getCommitStatus();
        if (status) {
            const parts = [];
            if (status.uncommitted > 0) {
                parts.push(`${status.uncommitted} uncommitted`);
            }
            this.elements.statusText.textContent = parts.join(' • ') || 'Up to date';
        }

        // Update rate limit
        const rateLimit = await this.githubAPI.getRateLimit();
        if (rateLimit) {
            this.elements.rateLimitStatus.textContent =
                `API: ${rateLimit.remaining}/${rateLimit.limit}`;
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        this.auth.logout();
        this.githubAPI = null;
        this.fileTree = null;
        this.gitOps = null;
        this.currentRepo = null;
        this.currentBranch = null;
        this.currentFile = null;

        if (this.editor) {
            this.editor.dispose();
            this.editor = null;
        }

        this.showScreen('login');
        this.showToast('Logged out successfully', 'info');
    }

    /**
     * Show screen
     */
    showScreen(screenName) {
        this.elements.loginScreen.classList.add('hidden');
        this.elements.repoScreen.classList.add('hidden');
        this.elements.ideScreen.classList.add('hidden');

        switch (screenName) {
            case 'login':
                this.elements.loginScreen.classList.remove('hidden');
                break;
            case 'repo':
                this.elements.repoScreen.classList.remove('hidden');
                break;
            case 'ide':
                this.elements.ideScreen.classList.remove('hidden');
                break;
        }
    }

    /**
     * Show loading overlay
     */
    showLoading(text = 'Loading...') {
        this.elements.loadingText.textContent = text;
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }

    /**
     * Show modal
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Hide modal
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        this.elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
    });
} else {
    window.app = new App();
}
