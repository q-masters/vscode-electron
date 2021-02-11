import { inject, singleton } from "tsyringe"
import { ElectronInstaller } from "./installer"
import { spawn, ChildProcess } from "child_process"
import * as vscode from "vscode"

@singleton()
export class ElectronManager {

    private processMap: Map<string, ChildProcess> = new Map();

    constructor(
        @inject(ElectronInstaller) private installer: ElectronInstaller
    ) {}

    /**
     * start or return an running process
     *
     */
    async run(file: string, args: string[]): Promise<ChildProcess | undefined> {
        if(await this.installer.validateInstallation()) {
            return this.resolveElectronProcess(file, args)
        } else {
            vscode.window.showErrorMessage(`Electron is not installed. Run "QMasters: install electron" before`)
        }
    }

    /**
     * resolves or create a new child process where electron is running
     *
     */
    private resolveElectronProcess(file: string, args: string[]): Promise<ChildProcess | undefined> {
        return this.processMap.has(file)
            ? Promise.resolve(this.processMap.get(file))
            : this.spawnElectronProcess(file, args);
    }

    /**
     * spawns a new electron process and adds to process map
     *
     */
    private async spawnElectronProcess(file: string, args: string[]): Promise<ChildProcess> {
        const command = await this.installer.resolveElectronCommand() as string;
        const spawn_env = JSON.parse(JSON.stringify(process.env))
        delete spawn_env.ATOM_SHELL_INTERNAL_RUN_AS_NODE
        delete spawn_env.ELECTRON_RUN_AS_NODE

        const electronProcess = spawn(command, [file, ...args], {env: spawn_env, stdio: ['ipc']})

        this.processMap.set(file, electronProcess)
        electronProcess.once(`close`, () => this.processMap.delete(file))

        return electronProcess
    }
}
