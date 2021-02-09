import "reflect-metadata";
import { container } from "tsyringe";
import * as vscode from "vscode";

import { ElectronInstaller, ELECTRON_INSTALL_PATH, ELECTRON_VERSION } from "./installer";

container.register(ELECTRON_INSTALL_PATH, {useValue: "./bin"});
container.register(ELECTRON_VERSION, {useValue: "11.1.0"});

export function activate(context: vscode.ExtensionContext) {

    const installer = container.resolve(ElectronInstaller);

    let disposable = vscode.commands.registerCommand('qmasters:install.electron', async () => {
        const isValid = await installer.validateInstallation();
        if (!isValid) {
            await installer.install();
        }

        vscode.window.showInformationMessage("Electron installed");
    });
      
    context.subscriptions.push(disposable);
}

/**
 * extension gets deactivated
 *
 */
export function deactivate() {
}
