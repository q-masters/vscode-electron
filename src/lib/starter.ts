import { PathLike } from "fs";
import { inject, singleton } from "tsyringe"
import { ElectronInstaller } from "./installer"
import { spawn } from "child_process"
import * as vscode from "vscode"
import { OUTPUT_CHANNEL } from "./api";

@singleton()
export class ElectronStarter {

    public constructor(
        @inject(ElectronInstaller) private installer: ElectronInstaller
    ) {}

    public async run(file: string) {
        if(await this.installer.validateInstallation()) {
            const command = await this.installer.resolveElectronCommand() as string;

            const spawn_env = JSON.parse(JSON.stringify(process.env))
            delete spawn_env.ATOM_SHELL_INTERNAL_RUN_AS_NODE
            delete spawn_env.ELECTRON_RUN_AS_NODE

            spawn(command, [file], {env: spawn_env})
        } else {
            vscode.window.showErrorMessage(`Electron is not installed. Run "QMasters: install electron" before`);
        }
    }
}
