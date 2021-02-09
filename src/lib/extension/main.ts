import "reflect-metadata";
import { container } from "tsyringe";
import * as vscode from "vscode";
import { ELECTRON_INSTALL_PATH, ELECTRON_VERSION, OUTPUT_CHANNEL } from "./api";

import { ElectronInstaller } from "./installer";

export function activate(context: vscode.ExtensionContext) {

    container.register(ELECTRON_INSTALL_PATH, {useValue: "./electron"});
    container.register(ELECTRON_VERSION, {useValue: "11.1.0"});
    container.register(OUTPUT_CHANNEL, {useValue: vscode.window.createOutputChannel('qmasters:electron')})

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
