const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

suite('Extension Test Suite', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('SLR.coding-agent-extension'));
    });

    test('Should activate', async () => {
        const ext = vscode.extensions.getExtension('SLR.coding-agent-extension');
        await ext.activate();
        assert.ok(true);
    });

    test('Should register commands', () => {
        return vscode.commands.getCommands(true).then((commands) => {
            assert.ok(commands.includes('codingAgent.generateCode'));
            assert.ok(commands.includes('codingAgent.useTemplate'));
        });
    });
}); 