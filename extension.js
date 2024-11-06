const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');

let agent = null;

class VSCodeCodingAgent {
    constructor(context) {
        this.context = context;
        this.pythonProcess = null;
        this.initializePythonAgent();
    }

    async initializePythonAgent() {
        try {
            // Show initialization progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Initializing Coding Agent...",
                cancellable: false
            }, async () => {
                const pythonAgentPath = path.join(this.context.extensionPath, 'code_agent.py');
                
                // Check if Python file exists
                if (!require('fs').existsSync(pythonAgentPath)) {
                    throw new Error('Python agent file not found');
                }

                // Get Python path from settings or default to 'python'
                const pythonPath = vscode.workspace.getConfiguration('codingAgent').get('pythonPath', 'python');
                
                this.pythonProcess = spawn(pythonPath, [pythonAgentPath]);

                // Handle process errors
                this.pythonProcess.on('error', (error) => {
                    vscode.window.showErrorMessage(`Failed to start Python process: ${error.message}`);
                });

                this.pythonProcess.stderr.on('data', (data) => {
                    console.error(`Python Error: ${data}`);
                    vscode.window.showErrorMessage(`Python Error: ${data}`);
                });

                // Verify process started successfully
                await new Promise((resolve, reject) => {
                    this.pythonProcess.stdout.once('data', () => resolve());
                    setTimeout(() => reject(new Error('Python process initialization timeout')), 5000);
                });
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Coding Agent: ${error.message}`);
            throw error;
        }
    }

    async generateCode(prompt, language) {
        return this._executeCommand('generate', { prompt, language });
    }

    async useTemplate(templateType, subtype) {
        return this._executeCommand('template', { templateType, subtype });
    }

    async _executeCommand(command, params) {
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
                this.pythonProcess.stdin.write(JSON.stringify({
                    command,
                    ...params
                }) + '\n');

                const response = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Command execution timeout'));
                    }, 30000);

                    this.pythonProcess.stdout.once('data', (data) => {
                        clearTimeout(timeout);
                        resolve(data.toString());
                    });
                });

                await editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, response);
                });

                return response;
            } catch (error) {
                throw new Error(`Error executing ${command}: ${error.message}`);
            }
        });
    }
}

function activate(context) {
    agent = new VSCodeCodingAgent(context);

    let generateCodeCommand = vscode.commands.registerCommand('codingAgent.generateCode', async () => {
        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter what code you want to generate'
        });
        
        const language = await vscode.window.showQuickPick(['python', 'javascript', 'typescript'], {
            placeHolder: 'Select programming language'
        });

        if (prompt && language) {
            agent.generateCode(prompt, language);
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
            agent.useTemplate(templateType, subtype);
        }
    });

    context.subscriptions.push(generateCodeCommand, useTemplateCommand);
}

function deactivate() {
    // Clean up Python process if it exists
    if (agent && agent.pythonProcess) {
        agent.pythonProcess.kill();
    }
}

module.exports = {
    activate,
    deactivate
}; 