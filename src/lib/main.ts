import "reflect-metadata";
import { container } from "tsyringe";
import * as vscode from "vscode";
import { ELECTRON_ENV_VARS, ELECTRON_INSTALL_PATH, EventParams, OUTPUT_CHANNEL } from "./api";

import { ElectronInstaller } from "./installer";
import { ElectronManager } from "./manager";


export function activate(context: vscode.ExtensionContext) {

    /**
     * set environment variables for electron, otherwise it seems
     * we are running in node context and electron will not run
     * correctly (12.18.3 which is the node version inside of vscode)
     *
     */
    const spawn_env = JSON.parse(JSON.stringify(process.env))
    delete spawn_env.ATOM_SHELL_INTERNAL_RUN_AS_NODE
    delete spawn_env.ELECTRON_RUN_AS_NODE

    container.register(ELECTRON_INSTALL_PATH, {useValue: "./electron"})
    container.register(OUTPUT_CHANNEL, {useValue: vscode.window.createOutputChannel('QMasters:Electron')})
    container.register(ELECTRON_ENV_VARS, { useValue: spawn_env})

    const installer = container.resolve(ElectronInstaller)
    const electronManager = container.resolve(ElectronManager)

    let disposables = [
        /**
         * validate electron version installed
         *
         */
        vscode.commands.registerCommand('qmasters:electron.validate', (version?: string) => installer.validate(version)),

        /**
         * install electron
         *
         */
        vscode.commands.registerCommand('qmasters:electron.install', (version?: string) => installer.install(version)),

        /**
         * run electron
         *
         */
        vscode.commands.registerCommand('qmasters:electron.run', async (file: string, ...args) => {
            let version = "latest";
            let params  = args;

            if (args[0].hasOwnProperty("version") && args[0].hasOwnProperty("params")) {
                [version, params] = args[0]
            }

            return electronManager.run(file, version, ...params)
        })
    ]

    context.subscriptions.push(...disposables)
}

/**
 * extension gets deactivated
 *
 */
export function deactivate() {
}
