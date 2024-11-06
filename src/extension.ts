import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { CommandRequest, CommandResponse } from './types';
import * as fs from 'fs';

let agent: VSCodeCodingAgent | null = null;

class VSCodeCodingAgent {
    private context: vscode.ExtensionContext;
    private pythonProcess: ChildProcess | null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.pythonProcess = null;
        this.initializePythonAgent();
    }

    private async initializePythonAgent(): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Initializing Coding Agent...",
                cancellable: false
            }, async () => {
                const pythonAgentPath = path.join(this.context.extensionPath, 'code_agent.py');
                
                if (!fs.existsSync(pythonAgentPath)) {
                    throw new Error('Python agent file not found');
                }

                const pythonPath = vscode.workspace.getConfiguration('codingAgent').get('pythonPath', 'python');
                
                this.pythonProcess = spawn(pythonPath, [pythonAgentPath]);

                this.pythonProcess.on('error', (error: Error) => {
                    vscode.window.showErrorMessage(`Failed to start Python process: ${error.message}`);
                });

                this.pythonProcess.stderr?.on('data', (data: Buffer) => {
                    console.error(`Python Error: ${data}`);
                    vscode.window.showErrorMessage(`Python Error: ${data}`);
                });

                await new Promise<void>((resolve, reject) => {
                    this.pythonProcess?.stdout?.once('data', () => resolve());
                    setTimeout(() => reject(new Error('Python process initialization timeout')), 5000);
                });
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Coding Agent: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    public async generateCode(prompt: string, language: string): Promise<string> {
        return this._executeCommand('generate', { prompt, language });
    }

    public async useTemplate(templateType: string, subtype: string): Promise<string> {
        return this._executeCommand('template', { templateType, subtype });
    }

    private async _executeCommand(command: string, params: Record<string, string>): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            throw new Error('No active editor');
        }

        if (!this.pythonProcess || this.pythonProcess.killed) {
            await this.initializePythonAgent();
        }

        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Executing ${command}...`,
            cancellable: false
        }, async () => {
            try {
                this.pythonProcess?.stdin?.write(JSON.stringify({
                    command,
                    ...params
                }) + '\n');

                const response = await new Promise<string>((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Command execution timeout'));
                    }, 30000);

                    this.pythonProcess?.stdout?.once('data', (data: Buffer) => {
                        clearTimeout(timeout);
                        resolve(data.toString());
                    });
                });

                await editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, response);
                });

                return response;
            } catch (error) {
                throw new Error(`Error executing ${command}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }

    public dispose(): void {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    agent = new VSCodeCodingAgent(context);

    let generateCodeCommand = vscode.commands.registerCommand('codingAgent.generateCode', async () => {
        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter what code you want to generate'
        });
        
        const language = await vscode.window.showQuickPick(['python', 'javascript', 'typescript'], {
            placeHolder: 'Select programming language'
        });

        if (prompt && language) {
            await agent?.generateCode(prompt, language);
        }
    });

    let useTemplateCommand = vscode.commands.registerCommand('codingAgent.useTemplate', async () => {
        const templateType = await vscode.window.showQuickPick(['web_app', 'data_structures', 'design_patterns'], {
            placeHolder: 'Select template type'
        });

        const subtype = await vscode.window.showQuickPick(['flask', 'linked_list', 'singleton'], {
            placeHolder: 'Select specific template'
        });

        if (templateType && subtype) {
            await agent?.useTemplate(templateType, subtype);
        }
    });

    context.subscriptions.push(generateCodeCommand, useTemplateCommand);
}

export function deactivate() {
    if (agent) {
        agent.dispose();
    }
} 