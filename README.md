# GitHub Mobile IDE

A mobile-first web application for browsing and editing GitHub repositories on the go, optimized for Unity C# development.

## Features

- 🔐 **GitHub OAuth Authentication** - Secure login with GitHub Device Flow
- 📱 **Mobile-First Design** - Optimized for touch interactions and mobile screens
- 📂 **File Tree Navigation** - Browse repository files with filtering (excludes Assets/ and Library/ folders)
- ✏️ **Monaco Editor** - Full-featured code editor with syntax highlighting
- 🎯 **C# Optimized** - Special support for C# development with mobile keyboard toolbar
- 📌 **Pinned Files** - Quick access to frequently used files
- 🌿 **Branch Management** - Switch branches and create new ones
- 💾 **Git Operations** - Commit, push, and pull changes
- 🌙 **Dark Theme** - Easy on the eyes, perfect for mobile
- 📦 **localStorage Support** - Save unsaved changes locally

## Getting Started

### Prerequisites

- A GitHub account
- A GitHub OAuth App (for authentication)

### Setting Up GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: GitHub Mobile IDE
   - **Homepage URL**: Your GitHub Pages URL (e.g., `https://yourusername.github.io/mobile-ide`)
   - **Authorization callback URL**: Same as homepage URL
4. Click "Register application"
5. Note down your **Client ID**
6. Open `scripts/auth.js` and replace the `clientId` value with your Client ID:
   ```javascript
   this.clientId = 'YOUR_CLIENT_ID_HERE';
   ```

### Installation

1. Clone or download this repository
2. Update the `clientId` in `scripts/auth.js` with your GitHub OAuth App Client ID
3. Host on GitHub Pages or any static hosting service

#### Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Push this code to the repository
3. Go to repository Settings > Pages
4. Select the branch to deploy (usually `main`)
5. Your app will be available at `https://yourusername.github.io/repository-name`

## Usage

### Authentication

1. Open the app in your mobile browser
2. Click "Login with GitHub"
3. You'll see a device code - click the link to open GitHub
4. Enter the code on GitHub and authorize the app
5. You'll be automatically logged in

### Working with Repositories

1. After login, select a repository from the list
2. The app will load the default branch and file tree
3. Use the search box to filter files by name
4. Tap any file to open it in the editor

### Editing Files

1. Open a file by tapping it in the file tree
2. Edit the content in the Monaco editor
3. Click "Save" to save changes locally (stored in browser)
4. Changes are marked with a dot (•) indicator

### Mobile Keyboard Toolbar

At the bottom of the editor, you'll find a toolbar with common C# symbols:
- `{` `}` - Curly braces
- `(` `)` - Parentheses
- `;` - Semicolon
- `=` - Equals
- `"` `'` - Quotes
- `<` `>` - Angle brackets
- `/` - Slash
- `⇥` - Tab (inserts 4 spaces)

### Pinning Files

1. Open a file you use frequently
2. Click the 📍 button to pin it
3. Pinned files appear as tabs in the top bar for quick access
4. Click the × on a pinned tab to unpin it

### Branch Management

- Use the branch dropdown to switch between branches
- Click the + button to create a new branch from the current one
- The app remembers your last used branch per repository

### Git Operations

#### Commit Changes

1. Make changes to one or more files
2. Click the "Commit" button (circle icon)
3. Review the list of changed files
4. Enter a commit message
5. Click "Commit" to commit changes

**Note**: With GitHub API, commits are automatically pushed to the remote repository.

#### Pull Changes

- Click the "Pull" button (down arrow) to fetch latest changes
- Warning: You cannot pull if you have unsaved changes

#### Push Changes

- Click the "Push" button (up arrow)
- If all changes are committed, you'll see a confirmation message
- Uncommitted changes will prevent pushing

### Logging Out

Click the logout icon in the top-right corner to log out. This will clear all stored data including auth token and unsaved changes.

## File Structure

```
/
├── index.html              # Main HTML file
├── styles/
│   └── main.css           # All styles (dark theme, responsive)
├── scripts/
│   ├── app.js             # Main application controller
│   ├── auth.js            # GitHub OAuth authentication
│   ├── github-api.js      # GitHub API wrapper (Octokit)
│   ├── file-tree.js       # File tree component
│   ├── editor.js          # Monaco editor integration
│   ├── git-ops.js         # Git operations (commit/push/pull)
│   └── storage.js         # localStorage management
└── README.md              # This file
```

## Browser Compatibility

- Chrome (Android & iOS)
- Safari (iOS)
- Firefox (Android)
- Samsung Internet
- Any modern mobile browser with ES6 support

## Limitations

- **Binary files**: Cannot be opened in the editor
- **Large files**: Files over 1MB cannot be opened
- **Merge conflicts**: Not supported - pull will fail if conflicts exist
- **GitHub API rate limits**: 5,000 requests per hour for authenticated users
- **No offline support**: Requires internet connection

## Security Notes

- Auth token is stored in browser localStorage
- Never commit your Client ID to a public repository (or use GitHub Secrets)
- The app has access to all your repositories - only use with trusted OAuth apps
- For production use, consider implementing token refresh and expiration handling

## Future Enhancements

Potential features for future versions:

- [ ] Multi-file diff viewer
- [ ] Merge conflict resolution
- [ ] Code snippets/templates
- [ ] Git history viewer
- [ ] Pull request creation
- [ ] IntelliSense/autocomplete for C#
- [ ] Service worker for offline support
- [ ] Dark/light theme toggle
- [ ] Collaborative editing

## Troubleshooting

### "Failed to initiate device flow"
- Check that your GitHub OAuth App Client ID is correct
- Ensure your OAuth App is properly configured on GitHub

### "API rate limit exceeded"
- Wait for the rate limit to reset (shown in status bar)
- Rate limits reset every hour

### "Cannot pull: You have unsaved changes"
- Commit or discard your changes before pulling

### Editor not loading
- Ensure you have a stable internet connection (Monaco loads from CDN)
- Try refreshing the page
- Clear browser cache and reload

### Files not showing in tree
- Check that the files are not in `Assets/` or `Library/` folders (these are filtered out)
- Try switching branches

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - The code editor component
- [Octokit.js](https://github.com/octokit/octokit.js) - GitHub REST API client
- [GitHub](https://github.com) - For the amazing API and platform

## Support

If you encounter issues or have questions:

1. Check the Troubleshooting section above
2. Review GitHub OAuth App settings
3. Check browser console for error messages
4. Ensure you're using a supported browser

---

**Built with ❤️ for mobile developers who code on the go**
