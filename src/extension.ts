import { statSync, existsSync } from 'fs';
import * as vscode from 'vscode';

import { TPin } from './types';
import { PinProvider } from './PinProvider';

import path = require('path');

export function activate(context: vscode.ExtensionContext) {
	const pinProvider = new PinProvider(context);

	vscode.commands.executeCommand('setContext', 'pinit.showTreeView', true);
	vscode.window.registerTreeDataProvider('pins', pinProvider);

	const pinDisposable = vscode.commands.registerCommand(
		'quick-pin.pinItem',
		async (selectedItem?: any) => {
			console.log('pinIt triggered with selectedItem:', selectedItem);
			
			try {
				// Method 1: Using the context menu selectedItem
				if (selectedItem && selectedItem.path) {
					try {
						console.log('Using provided selectedItem:', selectedItem);
						return handlePinning(selectedItem, context, pinProvider);
					} catch (error) {
						console.error('Error using selectedItem:', error);
					}
				}
				
				// Method 2: Using currently active text editor
				if (vscode.window.activeTextEditor) {
					try {
						const document = vscode.window.activeTextEditor.document;
						const uri = document.uri;
						const fsPath = uri.fsPath;
						
						console.log('Using active editor document:', fsPath);
						
						if (existsSync(fsPath)) {
							const isDirectory = statSync(fsPath).isDirectory();
							
							const item = {
								path: uri.toString(),
								scheme: isDirectory ? 'folder' : 'file',
								_fsPath: fsPath
							};
							
							return handlePinning(item, context, pinProvider);
						}
					} catch (error) {
						console.error('Error using active editor:', error);
					}
				}
				
				// Method 3: Using explorer selection API
				try {
					console.log('Trying to get explorer selection...');
					
					// Try all known commands that might return the selection
					const explorerSelection = 
						await vscode.commands.executeCommand<vscode.Uri[]>('explorer.getSelection') ||
						await vscode.commands.executeCommand<vscode.Uri[]>('_workbench.explorer.getSelection') ||
						await vscode.commands.executeCommand<vscode.Uri[]>('workbench.files.action.getExplorerSelection');
					
					console.log('Explorer selection result:', explorerSelection);
					
					if (explorerSelection && explorerSelection.length > 0) {
						const uri = explorerSelection[0];
						const fsPath = uri.fsPath;
						
						if (existsSync(fsPath)) {
							const isDirectory = statSync(fsPath).isDirectory();
							
							const item = {
								path: uri.toString(),
								scheme: isDirectory ? 'folder' : 'file',
								_fsPath: fsPath
							};
							
							return handlePinning(item, context, pinProvider);
						}
					}
				} catch (error) {
					console.error('Error getting explorer selection:', error);
				}
				
				// Method 4: Last resort - Get selection from clipboard
				try {
					console.log('Trying to use clipboard as last resort...');
					
					// Ask VS Code to copy the selected file path to clipboard
					await vscode.commands.executeCommand('copyFilePath');
					
					// Get clipboard content
					const clipboardText = await vscode.env.clipboard.readText();
					
					console.log('Clipboard text:', clipboardText);
					
					if (clipboardText && existsSync(clipboardText)) {
						const isDirectory = statSync(clipboardText).isDirectory();
						
						const item = {
							path: vscode.Uri.file(clipboardText).toString(),
							scheme: isDirectory ? 'folder' : 'file',
							_fsPath: clipboardText
						};
						
						return handlePinning(item, context, pinProvider);
					}
				} catch (error) {
					console.error('Error using clipboard method:', error);
				}
				
				// If all methods failed, show a message to the user
				vscode.window.showErrorMessage('Could not determine which item to pin. Please select an item in the explorer or editor first.');
				
			} catch (outerError) {
				console.error('Outer error in pinItem command:', outerError);
				vscode.window.showErrorMessage(`Error pinning item: ${outerError.message}`);
			}
		}
	);

	// Helper function to handle pinning once we have the item
	function handlePinning(
		selectedItem: { path: string; scheme: string; _fsPath: string },
		context: vscode.ExtensionContext,
		pinProvider: PinProvider
	) {
		console.log('handlePinning called with:', selectedItem);
		
		try {
			// Verify the item has the required properties before proceeding
			if (!selectedItem || !selectedItem.path || !selectedItem._fsPath) {
				throw new Error('Invalid item format');
			}
			
			// Check if the file exists
			if (!existsSync(selectedItem._fsPath)) {
				throw new Error('File does not exist');
			}
			
			const existingState: TPin[] | undefined = context.workspaceState.get('pins');
			
			if (existingState && existingState.some(i => i.fileLocation === selectedItem.path)) {
				return vscode.window.showInformationMessage(
					`A pin for this ${selectedItem.scheme} already exists.`,
				);
			}
			
			// Get the file basename safely
			const baseName = path.parse(selectedItem.path).base || path.basename(selectedItem.path) || 'Unknown';
			
			const isFolder = existsSync(selectedItem._fsPath) && statSync(selectedItem._fsPath).isDirectory();
			
			const newPins: TPin[] = [
				...(existingState || []),
				{
					label: baseName,
					type: isFolder ? 'folder' : 'file',
					fileLocation: selectedItem.path,
				},
			];
			
			context.workspaceState.update('pins', newPins);
			pinProvider.refresh(newPins);
			
			vscode.window.showInformationMessage(`Pinned: ${baseName}`);
		} catch (error) {
			console.error('Error in handlePinning:', error);
			vscode.window.showErrorMessage(`Error pinning item: ${error.message}`);
		}
	}

	const deleteDisposable = vscode.commands.registerCommand('quick-pin.deletePin', e => {
		const existingState: TPin[] | undefined = context.workspaceState.get('pins');
		const newPins = existingState?.filter(p => p.fileLocation !== e.fileLocation);
		if (!newPins) {
			return;
		}
		context.workspaceState.update('pins', newPins);
		pinProvider.refresh(newPins);
	});

	const deleteAllPins = vscode.commands.registerCommand('quick-pin.deleteAllPins', () => {
		context.workspaceState.update('pins', []);
		pinProvider.refresh([]);
	});

	const revealDisposable = vscode.commands.registerCommand('quick-pin.revealAndOpen', file => {
		vscode.commands.executeCommand('revealInExplorer', vscode.Uri.parse(file.path));
		vscode.commands.executeCommand('list.expand');
	});

	context.subscriptions.push(pinDisposable);
	context.subscriptions.push(deleteDisposable);
	context.subscriptions.push(revealDisposable);
	context.subscriptions.push(deleteAllPins);
}

export function deactivate() {}
