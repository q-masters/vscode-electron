import { container, inject, singleton } from "tsyringe"
import { ElectronInstaller } from "./installer"
import { spawn, ChildProcess } from "child_process"
import { DATA_NODE, ELECTRON_ENV_VARS, OUTPUT_CHANNEL } from "./api"

@singleton()
export class ElectronManager {

    private processMap: Map<string, ChildProcess> = new Map();

    constructor(
        @inject(ElectronInstaller) private installer: ElectronInstaller,
        @inject(ELECTRON_ENV_VARS) private envVars: DATA_NODE
    ) {}

    /**
     * start or return an running process
     *
     */
    run(file: string, version = "latest", ...args: string[]): Promise<ChildProcess | undefined> {

        const output = container.resolve(OUTPUT_CHANNEL);
        output.appendLine(`run ${version}`);

        const stream$ = version === "latest" ? this.installer.latestRelease() : Promise.resolve(version)
        return stream$
            // validate we allready installed the version which is required
            .then((requiredVersion) => Promise.all([this.installer.validate(requiredVersion), requiredVersion]))
            // if the version is not validated install electron in specific version
            .then(([validated, requiredVersion]) => !validated ? this.installer.install(requiredVersion) : requiredVersion)
            // start electron process
            .then((installed) => this.resolveElectronProcess(file, installed, ...args))
    }

    /**
     * resolves or create a new child process where electron is running
     *
     */
    private resolveElectronProcess(file: string, version?: string, ...args: string[]): ChildProcess | undefined {
        return this.processMap.has(file)
            ? this.processMap.get(file)
            : this.spawnElectronProcess(file, version, ...args)
    }

    /**
     * spawns a new electron process and adds to process map
     *
     */
    private spawnElectronProcess(file: string, version?: string, ...args: string[]): ChildProcess | undefined {
        const command = this.installer.resolveElectronCommand(version);
        if (command) {
            const electronProcess = spawn(command, [file, ...args], {env: this.envVars, stdio: ['ipc']})
            this.processMap.set(file, electronProcess)
            electronProcess.once(`close`, () => this.processMap.delete(file))
            return electronProcess
        }
       return void 0;
    }
}
