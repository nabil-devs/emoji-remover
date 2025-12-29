"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
function activate(context) {
    console.log('Emoji Remover extension is now active!');
    const backupDir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups');
    fs.mkdir(backupDir, { recursive: true }).catch(console.error);
    const removeFromFile = vscode.commands.registerCommand('emojiRemover.removeFromFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active text editor found.');
            return;
        }
        const document = editor.document;
        const text = document.getText();
        const cleanedText = removeEmojis(text);
        if (text === cleanedText) {
            vscode.window.showInformationMessage('No emojis found in the current file.');
            return;
        }
        await createBackup(document.uri, text);
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
        edit.replace(document.uri, fullRange, cleanedText);
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            showCompletionMessage(`Emojis removed from current file. Backup saved.`);
        }
    });
    const removeFromSelection = vscode.commands.registerCommand('emojiRemover.removeFromSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active text editor found.');
            return;
        }
        const selections = editor.selections;
        if (selections.length === 0 || selections[0].isEmpty) {
            vscode.window.showWarningMessage('Please select some text first.');
            return;
        }
        const document = editor.document;
        const originalText = document.getText();
        const edit = new vscode.WorkspaceEdit();
        let hasChanges = false;
        for (const selection of selections) {
            const text = document.getText(selection);
            const cleanedText = removeEmojis(text);
            if (text !== cleanedText) {
                hasChanges = true;
                edit.replace(document.uri, selection, cleanedText);
            }
        }
        if (!hasChanges) {
            vscode.window.showInformationMessage('No emojis found in the selection.');
            return;
        }
        await createBackup(document.uri, originalText);
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            showCompletionMessage(`Emojis removed from selection. Backup saved.`);
        }
    });
    const removeFromWorkspace = vscode.commands.registerCommand('emojiRemover.removeFromWorkspace', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder open.');
            return;
        }
        const config = vscode.workspace.getConfiguration('emojiRemover');
        const includePatterns = config.get('filePatterns', ['**/*']);
        const excludePatterns = config.get('excludePatterns', ['**/node_modules/**', '**/.git/**']);
        const userChoice = await vscode.window.showWarningMessage('This will remove emojis from all matching files in the workspace. Backups will be created. Continue?', { modal: true }, 'Yes', 'No', 'Show Backup Location');
        if (userChoice === 'Show Backup Location') {
            await showBackupLocation();
            return;
        }
        if (userChoice !== 'Yes') {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Removing emojis from workspace...",
            cancellable: false
        }, async (progress) => {
            let totalFiles = 0;
            let processedFiles = 0;
            let modifiedFiles = 0;
            let backupFiles = [];
            const files = [];
            for (const folder of workspaceFolders) {
                for (const pattern of includePatterns) {
                    const found = await vscode.workspace.findFiles(pattern, `{${excludePatterns.join(',')}}`);
                    files.push(...found);
                }
            }
            const uniqueFiles = Array.from(new Set(files.map(f => f.fsPath))).map(f => vscode.Uri.file(f));
            totalFiles = uniqueFiles.length;
            for (const fileUri of uniqueFiles) {
                progress.report({
                    message: `Processing ${path.basename(fileUri.fsPath)} (${processedFiles + 1}/${totalFiles})`,
                    increment: (100 / totalFiles)
                });
                try {
                    const content = await fs.readFile(fileUri.fsPath, 'utf8');
                    const cleanedContent = removeEmojis(content);
                    if (content !== cleanedContent) {
                        const backupPath = await createBackup(fileUri, content);
                        if (backupPath) {
                            backupFiles.push(backupPath);
                        }
                        await fs.writeFile(fileUri.fsPath, cleanedContent, 'utf8');
                        modifiedFiles++;
                    }
                }
                catch (error) {
                    console.error(`Error processing ${fileUri.fsPath}:`, error);
                }
                processedFiles++;
            }
            showCompletionMessage(`Processed ${totalFiles} files. Removed emojis from ${modifiedFiles} files. ${backupFiles.length} backups created.`);
        });
    });
    const showBackupCommand = vscode.commands.registerCommand('emojiRemover.showBackupLocation', async () => {
        await showBackupLocation();
    });
    const restoreBackupCommand = vscode.commands.registerCommand('emojiRemover.restoreFromBackup', async () => {
        await restoreFromBackup();
    });
    const starRepoCommand = vscode.commands.registerCommand('emojiRemover.starRepo', async () => {
        const repoUrl = 'https://github.com/nabil-devs/emoji-remover';
        vscode.env.openExternal(vscode.Uri.parse(repoUrl));
    });
    context.subscriptions.push(removeFromFile, removeFromSelection, removeFromWorkspace, showBackupCommand, restoreBackupCommand, starRepoCommand);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
function removeEmojis(text) {
    const config = vscode.workspace.getConfiguration('emojiRemover');
    const customRegex = config.get('emojiRegex');
    let regexPattern;
    if (customRegex) {
        try {
            regexPattern = new RegExp(customRegex, 'gu');
        }
        catch (error) {
            console.error('Invalid custom regex, using default:', error);
            regexPattern = getDefaultEmojiRegex();
        }
    }
    else {
        regexPattern = getDefaultEmojiRegex();
    }
    return text.replace(regexPattern, '');
}
function getDefaultEmojiRegex() {
    return new RegExp(/[\u{1F300}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{1F300}-\u{1F5FF}]/gu);
}
async function createBackup(fileUri, originalContent) {
    try {
        const backupDir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups');
        await fs.mkdir(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = path.basename(fileUri.fsPath);
        const backupFileName = `${timestamp}_${fileName}.backup`;
        const backupPath = path.join(backupDir, backupFileName);
        await fs.writeFile(backupPath, originalContent, 'utf8');
        return backupPath;
    }
    catch (error) {
        console.error('Failed to create backup:', error);
        return null;
    }
}
async function showBackupLocation() {
    const backupDir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups');
    try {
        await fs.access(backupDir);
        const choice = await vscode.window.showInformationMessage(`Backups are stored in: ${backupDir}`, 'Open Folder', 'List Backups');
        if (choice === 'Open Folder') {
            vscode.env.openExternal(vscode.Uri.file(backupDir));
        }
        else if (choice === 'List Backups') {
            const files = await fs.readdir(backupDir);
            if (files.length === 0) {
                vscode.window.showInformationMessage('No backups found.');
            }
            else {
                vscode.window.showInformationMessage(`Found ${files.length} backup files in ${backupDir}`);
            }
        }
    }
    catch {
        vscode.window.showInformationMessage('No backup directory exists yet.');
    }
}
async function restoreFromBackup() {
    const backupDir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups');
    try {
        await fs.access(backupDir);
        const files = await fs.readdir(backupDir);
        if (files.length === 0) {
            vscode.window.showInformationMessage('No backup files found.');
            return;
        }
        const items = files.map(file => ({
            label: file,
            description: path.join(backupDir, file),
            backupPath: path.join(backupDir, file)
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a backup file to restore'
        });
        if (!selected) {
            return;
        }
        const backupContent = await fs.readFile(selected.backupPath, 'utf8');
        const originalName = selected.label.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/, '').replace(/\.backup$/, '');
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(originalName),
            filters: {
                'All Files': ['*']
            }
        });
        if (saveUri) {
            await fs.writeFile(saveUri.fsPath, backupContent, 'utf8');
            vscode.window.showInformationMessage(`Backup restored to: ${saveUri.fsPath}`);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to restore backup: ${error}`);
    }
}
function showCompletionMessage(message) {
    const config = vscode.workspace.getConfiguration('emojiRemover');
    const showStarRequest = config.get('showStarRequest', true);
    if (showStarRequest) {
        vscode.window.showInformationMessage(`${message} If you find this extension helpful, please consider starring the repository!`, '⭐ Star on GitHub', 'Don\'t Show Again').then(selection => {
            if (selection === '⭐ Star on GitHub') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/nabil-devs/emoji-remover'));
            }
            else if (selection === 'Don\'t Show Again') {
                config.update('showStarRequest', false, vscode.ConfigurationTarget.Global);
            }
        });
    }
    else {
        vscode.window.showInformationMessage(message);
    }
}
//# sourceMappingURL=extension.js.map