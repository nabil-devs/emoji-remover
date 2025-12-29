# Emoji Remover VS Code Extension

Remove Unicode emojis from your files with this VS Code extension.

## Features

- **Remove from current file**: Clean emojis from the active editor
- **Remove from selection**: Clean emojis from selected text only
- **Remove from workspace**: Batch process files with filtering options

## Usage

1. **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`):
   - "Remove Emojis: Current File"
   - "Remove Emojis: From Selection"
   - "Remove Emojis: From Workspace (Filtered)"

2. **Context Menu**:
   - Right-click on selected text → "Remove Emojis: From Selection"

## Configuration

Add to your `settings.json`:

```json
{
  "emojiRemover.filePatterns": [
    "**/*.txt",
    "**/*.md",
    "**/*.json",
    "**/*.ts",
    "**/*.js"
  ],
  "emojiRemover.excludePatterns": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**"
  ],
  "emojiRemover.emojiRegex": "[\\u{1F300}-\\u{1F9FF}]"
}


Use at your own risk.