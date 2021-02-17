import { container, inject, singleton } from "tsyringe"
import { ElectronInstaller } from "./electron-installer"
import { spawn, ChildProcess } from "child_process"
import { DATA_NODE, ELECTRON_ENV_VARS, OUTPUT_CHANNEL } from "./api"
import { ElectronRepository } from "./electron-repository"
import { ElectronUsage } from "./electron-usage"

@singleton()
export class ElectronManager {

    private processMap: Map<string, ChildProcess> = new Map();

    constructor(
        @inject(ElectronInstaller) private installer: ElectronInstaller,
        @inject(ElectronRepository) private repository: ElectronRepository,
        @inject(ElectronUsage) private usageService: ElectronUsage,
        @inject(ELECTRON_ENV_VARS) private envVars: DATA_NODE
    ) { }

    /**
     * start or return an running process
     *
     */
    run(file: string, version = "latest", ...args: string[]): Promise<ChildProcess | undefined> {

        const stream$ = version === "latest" ? this.repository.latestRelease() : Promise.resolve(version)
        return stream$
            // validate we allready installed the version which is required
            .then((requiredVersion) => Promise.all([this.installer.validate(requiredVersion), requiredVersion]))
            // if the version is not validated install electron in specific version
            .then(([validated, requiredVersion]) => !validated ? this.installer.install(requiredVersion) : requiredVersion)
            // start electron process
            .then((installed) => {
                return this.resolveElectronProcess(file, installed, ...args)
            })
    }

    /**
     * remove electron installations which are not used since 2 weeks
     *
     */
    removeUnusedElectron(): void {

        this.usageService.resolveUnusedElectronVersions()
            /** remove all directories */
            .then((versions: string[]) => Promise.all(versions.map((version) => this.repository.removeElectron(version))))
            /** delete versions */
            .then((removed) => removed.filter((version): version is string => typeof version === "string"))
            /** remove data from json files */
            .then((data) => this.usageService.removeUnused(data))
    }

    /**
     * resolves or create a new child process where electron is running
     *
     */
    private async resolveElectronProcess(file: string, version?: string, ...args: string[]): Promise<ChildProcess | undefined> {

        return this.processMap.has(file)
            ? this.processMap.get(file)
            : this.spawnElectronProcess(file, version, ...args)
    }

    /**
     * spawns a new electron process and adds to process map
     *
     */
    private spawnElectronProcess(file: string, version?: string, ...args: string[]): Promise<ChildProcess | undefined> {

        this.usageService.updateUsage(version);

        return this.repository.resolveElectronCommand(version)
            .then((command) => {

                const output = container.resolve(OUTPUT_CHANNEL);
                output.appendLine(command ?? "no command found");

                if (!command) {
                    return;
                }

                const electronProcess = spawn(command, [file, ...args], {env: this.envVars, stdio: ['ipc']})
                this.processMap.set(file, electronProcess)
                electronProcess.once(`close`, () => this.processMap.delete(file))
                return electronProcess
            })
    }
}
