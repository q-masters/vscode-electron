import "reflect-metadata";
import { container } from "tsyringe";
import * as vscode from "vscode";
import { ELECTRON_INSTALL_PATH, ELECTRON_VERSION, OUTPUT_CHANNEL } from "./api";

import { ElectronInstaller } from "./installer";
import { ElectronManager } from "./manager";

export function activate(context: vscode.ExtensionContext) {

    container.register(ELECTRON_INSTALL_PATH, {useValue: "./electron"})
    container.register(ELECTRON_VERSION, {useValue: "11.1.0"})
    container.register(OUTPUT_CHANNEL, {useValue: vscode.window.createOutputChannel('QMasters:Electron')})

    const installer = container.resolve(ElectronInstaller)
    const electronManager = container.resolve(ElectronManager)

    let disposables = [
        /**
         * install electron
         *
         */
        vscode.commands.registerCommand('qmasters:electron.install', () => installer.install()),

        /**
         * run electron
         *
         */
        vscode.commands.registerCommand('qmasters:electron.run', async (file: string, ...args) => electronManager.run(file, args))
    ]

    context.subscriptions.push(...disposables)
}

/**
 * extension gets deactivated
 *
 */
export function deactivate() {
}
