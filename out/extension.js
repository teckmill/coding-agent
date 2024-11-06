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
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let agent = null;
class VSCodeCodingAgent {
    constructor(context) {
        this.context = context;
        this.pythonProcess = null;
        this.initializePythonAgent();
    }
    async initializePythonAgent() {
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
                this.pythonProcess = (0, child_process_1.spawn)(pythonPath, [pythonAgentPath]);
                this.pythonProcess.on('error', (error) => {
                    vscode.window.showErrorMessage(`Failed to start Python process: ${error.message}`);
                });
                this.pythonProcess.stderr?.on('data', (data) => {
                    console.error(`Python Error: ${data}`);
                    vscode.window.showErrorMessage(`Python Error: ${data}`);
                });
                await new Promise((resolve, reject) => {
                    this.pythonProcess?.stdout?.once('data', () => resolve());
                    setTimeout(() => reject(new Error('Python process initialization timeout')), 5000);
                });
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize Coding Agent: ${error instanceof Error ? error.message : String(error)}`);
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
                this.pythonProcess?.stdin?.write(JSON.stringify({
                    command,
                    ...params
                }) + '\n');
                const response = await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Command execution timeout'));
                    }, 30000);
                    this.pythonProcess?.stdout?.once('data', (data) => {
                        clearTimeout(timeout);
                        resolve(data.toString());
                    });
                });
                await editor.edit(editBuilder => {
                    editBuilder.insert(editor.selection.active, response);
                });
                return response;
            }
            catch (error) {
                throw new Error(`Error executing ${command}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    dispose() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
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
exports.activate = activate;
function deactivate() {
    if (agent) {
        agent.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map