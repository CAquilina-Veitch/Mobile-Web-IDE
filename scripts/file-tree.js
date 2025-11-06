/**
 * File Tree Module
 * Manages the file tree UI with filtering and navigation
 */

import { Storage } from './storage.js';

export class FileTree {
    constructor(containerElement, onFileSelect, onContextMenu) {
        this.container = containerElement;
        this.onFileSelect = onFileSelect;
        this.onContextMenu = onContextMenu;
        this.treeData = [];
        this.flatFileList = [];
        this.filterQuery = '';
        this.selectedPath = null;
        this.expandedFolders = new Set();
        this.owner = null;
        this.repo = null;
    }

    /**
     * Set repository info
     */
    setRepo(owner, repo) {
        this.owner = owner;
        this.repo = repo;
    }

    /**
     * Build tree structure from GitHub tree data
     */
    buildTree(githubTree) {
        // Filter out Library folder and hidden paths
        const filteredTree = githubTree.tree.filter(item => {
            const path = item.path;

            // Filter out Library folder
            if (path.startsWith('Library/') || path === 'Library') {
                return false;
            }

            // Filter out hidden paths
            if (this.owner && this.repo) {
                if (Storage.isPathHidden(this.owner, this.repo, path)) {
                    return false;
                }
            }

            return true;
        });

        // Build hierarchical structure
        const root = {};

        filteredTree.forEach(item => {
            const parts = item.path.split('/');
            let current = root;

            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // This is the file/folder itself
                    current[part] = {
                        type: item.type,
                        path: item.path,
                        sha: item.sha,
                        size: item.size,
                        name: part
                    };
                } else {
                    // This is a parent folder
                    if (!current[part]) {
                        current[part] = {
                            type: 'tree',
                            path: parts.slice(0, index + 1).join('/'),
                            name: part,
                            children: {}
                        };
                    }
                    if (!current[part].children) {
                        current[part].children = {};
                    }
                    current = current[part].children;
                }
            });
        });

        this.treeData = root;

        // Create flat list for searching
        this.flatFileList = filteredTree
            .filter(item => item.type === 'blob')
            .map(item => ({
                path: item.path,
                name: item.path.split('/').pop(),
                sha: item.sha,
                size: item.size
            }));

        return this.treeData;
    }

    /**
     * Render the tree
     */
    render() {
        this.container.innerHTML = '';

        if (this.filterQuery) {
            this.renderFiltered();
        } else {
            this.renderTree(this.treeData, this.container);
        }
    }

    /**
     * Render filtered results
     */
    renderFiltered() {
        const query = this.filterQuery.toLowerCase();
        const matches = this.flatFileList.filter(file =>
            file.path.toLowerCase().includes(query) ||
            file.name.toLowerCase().includes(query)
        );

        if (matches.length === 0) {
            this.container.innerHTML = '<div class="tree-item" style="opacity: 0.5;">No files found</div>';
            return;
        }

        matches.forEach(file => {
            const item = this.createTreeItem(file.name, file.path, 'blob', 0);
            this.container.appendChild(item);
        });
    }

    /**
     * Render tree recursively
     */
    renderTree(node, container, level = 0, parentPath = '') {
        const entries = Object.entries(node).sort((a, b) => {
            // Folders first, then files
            const aIsFolder = a[1].type === 'tree';
            const bIsFolder = b[1].type === 'tree';

            if (aIsFolder && !bIsFolder) return -1;
            if (!aIsFolder && bIsFolder) return 1;
            return a[0].localeCompare(b[0]);
        });

        entries.forEach(([name, data]) => {
            const item = this.createTreeItem(name, data.path, data.type, level);
            container.appendChild(item);

            if (data.type === 'tree' && data.children) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';

                if (!this.expandedFolders.has(data.path)) {
                    childrenContainer.classList.add('collapsed');
                }

                this.renderTree(data.children, childrenContainer, level + 1, data.path);
                container.appendChild(childrenContainer);
            }
        });
    }

    /**
     * Create a tree item element
     */
    createTreeItem(name, path, type, level) {
        const item = document.createElement('div');
        item.className = 'tree-item';
        if (type === 'tree') {
            item.classList.add('folder');
        }
        if (path === this.selectedPath) {
            item.classList.add('selected');
        }

        item.style.paddingLeft = `${8 + level * 16}px`;
        item.dataset.path = path;
        item.dataset.type = type;

        // Icon
        const icon = document.createElement('span');
        icon.className = 'icon';

        if (type === 'tree') {
            icon.textContent = this.expandedFolders.has(path) ? '▼' : '▶';
        } else {
            // File icon based on extension
            const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
            icon.textContent = this.getFileIcon(ext);
        }

        // Name
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;

        item.appendChild(icon);
        item.appendChild(nameSpan);

        // Event listeners
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleItemClick(path, type);
        });

        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.onContextMenu) {
                this.onContextMenu(e.clientX, e.clientY, path);
            }
        });

        return item;
    }

    /**
     * Get file icon based on extension
     */
    getFileIcon(ext) {
        const icons = {
            '.cs': '🎯',
            '.js': '📜',
            '.ts': '📘',
            '.json': '📋',
            '.xml': '📄',
            '.txt': '📝',
            '.md': '📖',
            '.html': '🌐',
            '.css': '🎨',
            '.png': '🖼️',
            '.jpg': '🖼️',
            '.gif': '🖼️',
            '.mp3': '🎵',
            '.mp4': '🎬'
        };

        return icons[ext] || '📄';
    }

    /**
     * Handle tree item click
     */
    handleItemClick(path, type) {
        if (type === 'tree') {
            // Toggle folder
            if (this.expandedFolders.has(path)) {
                this.expandedFolders.delete(path);
            } else {
                this.expandedFolders.add(path);
            }
            this.render();
        } else {
            // File selected
            this.selectedPath = path;
            this.render();

            if (this.onFileSelect) {
                this.onFileSelect(path);
            }
        }
    }

    /**
     * Set filter query
     */
    setFilter(query) {
        this.filterQuery = query;
        this.render();
    }

    /**
     * Select a file programmatically
     */
    selectFile(path) {
        this.selectedPath = path;

        // Expand parent folders
        const parts = path.split('/');
        for (let i = 1; i < parts.length; i++) {
            const folderPath = parts.slice(0, i).join('/');
            this.expandedFolders.add(folderPath);
        }

        this.render();
    }

    /**
     * Get selected file path
     */
    getSelectedPath() {
        return this.selectedPath;
    }

    /**
     * Clear tree
     */
    clear() {
        this.treeData = [];
        this.flatFileList = [];
        this.selectedPath = null;
        this.expandedFolders.clear();
        this.container.innerHTML = '';
    }

    /**
     * Check if path should be ignored
     */
    static shouldIgnorePath(path) {
        return path.startsWith('Library/') ||
               path === 'Library';
    }
}

export default FileTree;
