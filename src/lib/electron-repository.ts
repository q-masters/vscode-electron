import * as fs from "fs"
import * as path from "path"
import { container, inject, singleton } from "tsyringe"
import { exec } from "child_process"
import * as os from "os"
import { ELECTRON_ENV_VARS, OUTPUT_CHANNEL } from "./api"

@singleton()
export class ElectronRepository {

    /**
     * latest version
     *
     */
    private latestVersion: string = ""

    /**
     * all installed versions which could be found
     *
     */
    private installedVersions: string[] = []

    /**
     * boolean flag we allready have checked for installed versions
     * and persist them into cache
     *
     */
    private checkedInstalledVersions = false

    /**
     * cache for all available electron versions
     *
     */
    private installed: {[key: string]: string} = {}

    constructor(
        @inject(ELECTRON_ENV_VARS) private envVars: any
    ) {}

    /**
     * add new version
     *
     */
    async addVersion(version: string, command: string) {
        if (this.installedVersions.indexOf(version)  < 0) {
            await this.writeVersion(version, command)
            this.installedVersions.push(version)
        }
    }

    /**
     * remove a electron version
     * 
     * neither fs.rmdir, del nor fs.unlinkSyc(../default_app.asar) was working
     * he could not delete the directory since resources/default_app.asar could
     * not deleted, after that the directory was used by another process.
     * 
     * so we decide to use file system operations rmdir /s /q for windows and
     * rm -rf for linux windows to remove the directory since this was the only way
     * it is working inside of vscode
     *
     */
    removeElectron(version: string): Promise<string> {
        const directory = path.resolve(__dirname, 'electron_' + version)
        return new Promise((resolve) => {
            exec('rmdir /s /q ' + directory, {env: this.envVars}, (err) => {
                err ? "" : resolve(version)
            })
        })
    }

    /**
     * remove installed versions
     *
     */
    removeInstalled(versions: string[]) {
        const newInstalled = {...this.installed}

        for (let i = 0, ln = versions.length; i < ln; i++) {
            delete newInstalled[versions[i]];
        }

        this.writeVersions(newInstalled)
    }

    /**
     * get latest release
     *
     */
    async latestRelease(): Promise<string> {
        if (this.latestVersion === "") {
            const response = await fetch('https://api.github.com/repos/electron/electron/releases/latest')
            const body     = await response.json()
            this.latestVersion = body.tag_name as string
        }
        return this.latestVersion
    }

    /**
     * get path from our installed electron
     * btw we could say it is a valid installation if we have an command
     *
     */
    get versions(): Promise<string[]> {

        if (this.checkedInstalledVersions) {
            return Promise.resolve(this.installedVersions)
        }

        const global = this.resolveGlobalElectron().then(([version]) => [version])
        const local =  new Promise<string[]>((resolve, reject) => {
            const versionsPath = path.resolve(__dirname, 'versions')
            fs.readFile(versionsPath, {encoding: 'utf8'}, (err, data) => {
                err ? reject() : resolve(Object.keys(JSON.parse(data)))
            })
        })
        .catch<string[]>(() => [])

        return Promise.all<string[]>([global, local])
            .then((data) =>data.reduce((current, next) => current.concat(next),[]))
            .then((values) => {
                this.installedVersions = values.filter((value, index, data) => data.indexOf(value) === index)
                return this.installedVersions
            })
    }

    /**
     * resolve electron command by passed version
     *
     */
    async resolveElectronCommand(version?: string): Promise<string | undefined> {
        const versionRequired = version ?? await this.latestRelease();
        const versions = await this.resolveVersions()
        return versions[versionRequired]
    }

    /**
     * get platform path for electron
     *
     */
    resolvePlatformPath() {
        const platform = process.env.npm_config_platform || os.platform()
        switch (platform) {
            case 'mas':
            case 'darwin':
            return 'Electron.app/Contents/MacOS/Electron'
            case 'freebsd':
            case 'openbsd':
            case 'linux':
            return 'electron'
            case 'win32':
            return 'electron.exe'
            default:
            throw new Error('Electron builds are not available on platform: ' + platform)
        }
    }

    /**
     * check electron is installed globaly
     *
     */
    private async resolveGlobalElectron(): Promise<string[]> {

        return this.resolveGlobalElectronVersion()
            .then((version) => [version, os.platform() === 'win32' ? 'electron.cmd' : 'electron'])
            .catch(() => {
                const command = path.resolve('/Applications', this.resolvePlatformPath())

                let performCheck = os.platform() === 'darwin'
                performCheck = performCheck && fs.existsSync(command) 
                performCheck = performCheck && fs.statSync(command).isFile()

                if (performCheck) {
                    return this.resolveGlobalElectronVersion(command)
                        .then((version) => [version, command])
                }
                return []
            })
            .then(([version, command]) => {
                if (!version) {
                    return []
                }

                this.installed[version] = command
                return [version, command]
            })
    }

    /**
     * resolve global installed electron version
     *
     */
    private resolveGlobalElectronVersion(command = `electron`): Promise<string> {
        return new Promise((resolve, reject) => {
            exec(`${command} --version`, {env: this.envVars}, (err, version) => {
                err ? reject() : resolve(version.replace(/[\r\n]/, "").trim())
            })
        })
    }

    /**
     * resolve installed versions including the paths
     *
     */
    private resolveVersions(): Promise<{[key: string]: string}> {
        const versionsPath = path.resolve(__dirname, 'versions')
        return new Promise<{[key: string]: string}>((resolve, reject) => {
            fs.readFile(versionsPath, {encoding: "utf8"}, (err, data) => {
                const output = container.resolve(OUTPUT_CHANNEL);
                output.appendLine(err ? err.message : JSON.stringify(data))
                err ? reject() : resolve(JSON.parse(data))
            })
        })
        .catch(() => ({}))
        .then((data) => this.installed = data)
    }

    /**
     * write versions
     *
     */
    private writeVersions(data: {[key: string]: string}): Promise<void> {
        const versionsPath = path.resolve(__dirname, 'versions')
        return new Promise((resolve, reject) => {
            fs.writeFile(versionsPath, JSON.stringify(data), {encoding: "utf8"}, (err) => {
                err ? reject() : resolve()
            })
        })
    }

    /**
     * write the path to executable binary into the path.txt
     *
     */
    private writeVersion(version: string, executablePath: string) {

        const output = container.resolve(OUTPUT_CHANNEL);
        output.appendLine(`run ${version}`);

        return this.resolveVersions()
            .then((data) => (data[version] = executablePath, data))
            .then((data) => this.writeVersions(data))
            .then((data) => output.appendLine("data written"))
            .then(() => this.installed[version] = executablePath)
    }
}
