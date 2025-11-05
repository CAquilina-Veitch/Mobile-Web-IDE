# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub Mobile IDE is a mobile-first web application for browsing and editing GitHub repositories on the go. It's a single-page application using vanilla JavaScript with ES6 modules, Monaco Editor for code editing, and Octokit.js for GitHub API integration. No build process or bundler required - the app runs directly in the browser from static files.

## Architecture

### Module System

The application uses a modular architecture with ES6 modules. Each module is a class that handles a specific domain:

- **app.js**: Main orchestrator that coordinates all modules and manages application state (current repo, branch, file, pinned files)
- **auth.js**: GitHub OAuth Device Flow authentication with polling mechanism
- **github-api.js**: Octokit wrapper providing repository operations, file management, and caching (5-minute cache duration)
- **storage.js**: localStorage abstraction for auth tokens, pinned files, unsaved changes, branch preferences
- **editor.js**: Monaco Editor integration with dirty state tracking and language detection
- **file-tree.js**: File tree navigation component with filtering (excludes Assets/ and Library/ folders for Unity projects)
- **git-ops.js**: Git operations (commit/pull/push) via GitHub API

### Key Architectural Patterns

1. **State Management**: Application state lives in the App class (scripts/app.js). Modules communicate through callbacks and the App instance coordinates state changes.

2. **Storage Model**: All local data is stored in localStorage with a structured key format. Unsaved changes are tracked per-file using keys like `{owner}/{repo}/{filePath}`.

3. **GitHub API Integration**: The app uses the GitHub REST API directly via Octokit. Commits are pushed immediately (no local git repository). This means commits and pushes are the same operation.

4. **File State Tracking**: Files have three states:
   - Original (from GitHub)
   - Saved locally (stored in localStorage)
   - Committed (pushed to GitHub immediately)

5. **Dirty State**: The editor tracks changes against the original content. Changes are saved to localStorage but not committed until the user explicitly commits.

## Development Setup

### No Build Process

This is a static HTML/CSS/JS application. Just open `index.html` in a browser or serve it with any static web server:

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js (npx)
npx serve .
```

Then navigate to `http://localhost:8000`

### GitHub OAuth Setup

Before running the app, you need a GitHub OAuth App:

1. Create at https://github.com/settings/developers
2. Set homepage URL and callback URL to your hosting URL
3. Update `clientId` in scripts/auth.js:14 with your Client ID

### Testing Locally

For local development, set the OAuth callback URL to `http://localhost:8000` (or whatever port you're using).

## Code Conventions

### Module Structure

Each module exports a single class:
```javascript
export class ModuleName {
    constructor(dependencies) {
        // Initialize
    }

    async methodName() {
        // Implementation
    }
}

export default ModuleName;
```

### Error Handling

- All async operations use try-catch blocks
- Errors are logged to console and displayed to users via toast notifications
- The app shows user-friendly error messages via `app.showToast(message, 'error')`

### Storage Keys

All localStorage keys are defined in `storage.js` with the prefix `github_ide_*` to avoid conflicts.

### UI State Management

- Screens (login/repo/ide) are toggled using `app.showScreen(name)`
- Modals are controlled via `app.showModal(id)` and `app.hideModal(id)`
- Loading states use `app.showLoading(text)` and `app.hideLoading()`

## Important Implementation Details

### Authentication Flow (scripts/auth.js)

The app uses GitHub Device Flow (not regular OAuth redirect):
1. Request device code from GitHub
2. Display code to user
3. Poll GitHub API every 5 seconds until user authorizes
4. Store access token in localStorage

### File Caching (scripts/github-api.js)

The GitHubAPI class caches responses for 5 minutes to reduce API calls:
- Repository tree structures
- Branch lists
- Repository metadata
Cache is cleared when branches change or files are committed.

### Commit Strategy (scripts/git-ops.js)

Commits use the GitHub API low-level git methods:
1. Create blobs for each changed file
2. Create a new tree with the blobs
3. Create a commit pointing to the new tree
4. Update the branch reference

This allows multiple files to be committed atomically.

### Editor Integration (scripts/editor.js)

Monaco Editor is loaded from CDN. The editor:
- Detects language from file extension
- Disables most IntelliSense features for mobile performance
- Tracks dirty state by comparing current content to original
- Supports Ctrl+S/Cmd+S to save locally

### Mobile Optimizations

- Keyboard toolbar (scripts/app.js:setupKeyboardToolbar) inserts common characters
- Minimap disabled in editor
- Autocomplete and suggestions disabled for performance
- File tree drawer toggles on mobile (<768px)
- Touch-optimized UI with appropriate button sizes

## GitHub API Rate Limits

The app displays rate limit status in the bottom-right corner. GitHub allows:
- 5,000 requests/hour for authenticated users
- Rate limit resets every hour

The caching strategy helps minimize API calls.

## File Filtering

The FileTree component automatically filters out:
- `Assets/` folders (Unity)
- `Library/` folders (Unity)
- Binary files (detected by extension in github-api.js:isBinaryFile)
- Files larger than 1MB

## Debugging

Key debugging locations:
- Authentication issues: Check console for Device Flow errors
- API errors: All API calls are wrapped in try-catch and log to console
- Storage issues: Inspect localStorage in browser DevTools (keys prefixed with `github_ide_`)
- Editor problems: Check `window.monaco` is loaded and `app.editor` is initialized

## Monaco Editor

Monaco is loaded from CDN in index.html. The editor instance is available at `app.editor` after initialization. Language detection supports C#, JavaScript, TypeScript, Python, JSON, YAML, Markdown, and more.

## Common Gotchas

1. **OAuth Client ID**: Must be updated in auth.js for the app to work
2. **Commits are immediate**: There's no local staging - commits push directly to GitHub
3. **No merge conflict resolution**: Pull will fail if there are conflicts
4. **localStorage limits**: Browser localStorage is typically 5-10MB - large codebases may hit limits
5. **Binary files**: Cannot be opened or edited
6. **CORS**: The GitHub API supports CORS, but some proxies may interfere
