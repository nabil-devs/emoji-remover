import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'

export function activate(context: vscode.ExtensionContext) {
    const backupDir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups')
    fs.mkdir(backupDir, { recursive: true }).catch(() => {})

    const removeFromFile = vscode.commands.registerCommand('emojiRemover.removeFromFile', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            vscode.window.showWarningMessage('No active text editor found.')
            return
        }

        const document = editor.document
        const original = document.getText()
        const cleaned = removeEmojisAndSpaces(original)

        if (original === cleaned) {
            vscode.window.showInformationMessage('No emojis found in the current file.')
            return
        }

        await createBackup(document.uri, original)

        const edit = new vscode.WorkspaceEdit()
        edit.replace(
            document.uri,
            new vscode.Range(document.positionAt(0), document.positionAt(original.length)),
            cleaned
        )

        if (await vscode.workspace.applyEdit(edit)) {
            showCompletionMessage('Emojis removed from current file. Backup saved.')
        }
    })

    const removeFromSelection = vscode.commands.registerCommand('emojiRemover.removeFromSelection', async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            vscode.window.showWarningMessage('No active text editor found.')
            return
        }

        if (editor.selections.length === 0 || editor.selections[0].isEmpty) {
            vscode.window.showWarningMessage('Please select some text first.')
            return
        }

        const document = editor.document
        const fullText = document.getText()
        const edit = new vscode.WorkspaceEdit()
        let changed = false

        for (const selection of editor.selections) {
            const text = document.getText(selection)
            const cleaned = removeEmojisAndSpaces(text)
            if (text !== cleaned) {
                edit.replace(document.uri, selection, cleaned)
                changed = true
            }
        }

        if (!changed) {
            vscode.window.showInformationMessage('No emojis found in the selection.')
            return
        }

        await createBackup(document.uri, fullText)

        if (await vscode.workspace.applyEdit(edit)) {
            showCompletionMessage('Emojis removed from selection. Backup saved.')
        }
    })

    const removeFromWorkspace = vscode.commands.registerCommand('emojiRemover.removeFromWorkspace', async () => {
        const folders = vscode.workspace.workspaceFolders
        if (!folders) {
            vscode.window.showWarningMessage('No workspace folder open.')
            return
        }

        const config = vscode.workspace.getConfiguration('emojiRemover')
        const includes = config.get<string[]>('filePatterns', ['**/*'])
        const excludes = config.get<string[]>('excludePatterns', ['**/node_modules/**', '**/.git/**'])

        const choice = await vscode.window.showWarningMessage(
            'This will remove emojis from all matching files in the workspace. Backups will be created. Continue?',
            { modal: true },
            'Yes',
            'No'
        )

        if (choice !== 'Yes') return

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Removing emojis from workspace...',
                cancellable: false
            },
            async progress => {
                const uris: vscode.Uri[] = []

                for (const folder of folders) {
                    for (const pattern of includes) {
                        const found = await vscode.workspace.findFiles(
                            pattern,
                            `{${excludes.join(',')}}`
                        )
                        uris.push(...found)
                    }
                }

                const files = Array.from(new Set(uris.map(u => u.fsPath))).map(p => vscode.Uri.file(p))
                let processed = 0
                let modified = 0

                for (const uri of files) {
                    progress.report({
                        message: `Processing ${path.basename(uri.fsPath)} (${processed + 1}/${files.length})`,
                        increment: 100 / files.length
                    })

                    try {
                        const content = await fs.readFile(uri.fsPath, 'utf8')
                        const cleaned = removeEmojisAndSpaces(content)
                        if (content !== cleaned) {
                            await createBackup(uri, content)
                            await fs.writeFile(uri.fsPath, cleaned, 'utf8')
                            modified++
                        }
                    } catch {}

                    processed++
                }

                showCompletionMessage(`Processed ${files.length} files. Modified ${modified} files.`)
            }
        )
    })
 
    context.subscriptions.push(
        removeFromFile,
        removeFromSelection,
        removeFromWorkspace,
        vscode.commands.registerCommand('emojiRemover.showBackupLocation', showBackupLocation),
        vscode.commands.registerCommand('emojiRemover.restoreFromBackup', restoreFromBackup)
    )
}

export function deactivate() {}

function removeEmojisAndSpaces(text: string): string {
    const config = vscode.workspace.getConfiguration('emojiRemover')
    const custom = config.get<string>('emojiRegex')

    let source: string

    if (custom) {
        try {
            new RegExp(custom, 'u')
            source = custom
        } catch {
            source = defaultEmojiSource()
        }
    } else {
        source = defaultEmojiSource()
    }

    const regex = new RegExp(`(${source})`, 'gu')

    return text
        .replace(regex, (_m, _e, offset, full) => {
            const before = full[offset - 1]
            const after = full[offset + _m.length]

            if (before && after && /\w/.test(before) && /\w/.test(after)) {
                return ' '
            }

            if (before === ' ') return ''
            if (after === ' ') return ''

            return ''
        })
        .replace(/[\uFE0E\uFE0F]/g, '')
        .replace(/ {2,}/g, ' ')
        .replace(/[ \t]+$/gm, '')
}

function defaultEmojiSource(): string {
    return [
        '[\\u{1F300}-\\u{1FAFF}]',
        '[\\u{2600}-\\u{27BF}]',
        '[\\u{1F1E6}-\\u{1F1FF}]'
    ].join('|')
}

async function createBackup(uri: vscode.Uri, content: string): Promise<string | null> {
    try {
        const dir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups')
        await fs.mkdir(dir, { recursive: true })
        const ts = new Date().toISOString().replace(/[:.]/g, '-')
        const name = `${ts}_${path.basename(uri.fsPath)}.backup`
        const full = path.join(dir, name)
        await fs.writeFile(full, content, 'utf8')
        return full
    } catch {
        return null
    }
}

async function showBackupLocation(): Promise<void> {
    const dir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups')
    try {
        await fs.access(dir)
        const choice = await vscode.window.showInformationMessage(
            `Backups are stored in: ${dir}`,
            'Open Folder'
        )
        if (choice === 'Open Folder') {
            vscode.env.openExternal(vscode.Uri.file(dir))
        }
    } catch {
        vscode.window.showInformationMessage('No backup directory exists yet.')
    }
}

async function restoreFromBackup(): Promise<void> {
    const dir = path.join(os.tmpdir(), 'vscode-emoji-remover-backups')
    try {
        await fs.access(dir)
        const files = await fs.readdir(dir)
        if (files.length === 0) {
            vscode.window.showInformationMessage('No backup files found.')
            return
        }

        const selected = await vscode.window.showQuickPick(files)
        if (!selected) return

        const content = await fs.readFile(path.join(dir, selected), 'utf8')
        const original = selected.replace(/^[^_]+_/, '').replace(/\.backup$/, '')

        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(original)
        })

        if (saveUri) {
            await fs.writeFile(saveUri.fsPath, content, 'utf8')
            vscode.window.showInformationMessage(`Backup restored to: ${saveUri.fsPath}`)
        }
    } catch {
        vscode.window.showErrorMessage('Failed to restore backup.')
    }
}

function showCompletionMessage(message: string): void {
    const config = vscode.workspace.getConfiguration('emojiRemover')
    const showStar = config.get<boolean>('showStarRequest', true)

    if (!showStar) {
        vscode.window.showInformationMessage(message)
        return
    }

    vscode.window.showInformationMessage(
        `${message} If you find this extension helpful, please consider starring the repository!`,
        '⭐ Star on GitHub',
        'Don\'t Show Again'
    ).then(choice => {
        if (choice === '⭐ Star on GitHub') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/nabil-devs/emoji-remover'))
        }
        if (choice === 'Don\'t Show Again') {
            config.update('showStarRequest', false, vscode.ConfigurationTarget.Global)
        }
    })
}
