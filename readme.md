# Emoji Remover VS Code Extension

Remove Unicode emojis from your files with automatic backup support.

## Features

- **Remove from current file**: Clean emojis from the active editor
- **Remove from selection**: Clean emojis from selected text only
- **Remove from workspace**: Batch process files with filtering options
- **Automatic backups**: Every operation creates a timestamped backup
- **Restore functionality**: Restore any file from backup
- **Safe operations**: Never lose your original content

## Quick Start

1. **Install the extension** from VS Code Marketplace
2. **Open any file** containing emojis
3. Use Command Palette (Ctrl+Shift+P or Cmd+Shift+P):
   - "Remove Emojis: Current File" - Clean current file
   - "Remove Emojis: From Selection" - Clean selected text
   - "Remove Emojis: From Workspace" - Batch clean multiple files


## Backup System

The extension automatically creates backups before making any changes:

- **Location**: System temp directory (/tmp/vscode-emoji-remover-backups/ on Linux/macOS)
- **Format**: Timestamped files (e.g., 2024-01-15T10-30-00-123Z_filename.txt.backup)
- **Restore**: Use "Emoji Remover: Restore from Backup" command
- **View**: Use "Emoji Remover: Show Backup Location" command

## Support the Project

If you find this extension helpful, please consider starring the repository!

[Star on GitHub](https://github.com/nabil-devs/emoji-remover)

After each successful operation, you'll see an option to star the repo. You can disable this in settings.

## Development

Clone the repository:
git clone https://github.com/nabil-devs/emoji-remover.git

Install dependencies:
npm install

Build the extension:
npm run compile

Debug in VS Code:
Press F5 to launch extension development host

## Packaging

Install vsce:
npm install -g @vscode/vsce

Package the extension:
vsce package

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

GNU AFFERO GENERAL PUBLIC LICENSE v3.0 License - see LICENSE file for details.

## Acknowledgments

- VS Code Extension API
- Unicode Emoji Technical Standard
- All contributors and users

