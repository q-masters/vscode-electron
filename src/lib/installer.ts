
import { inject, singleton } from 'tsyringe'
import { spawn, exec } from "child_process"
import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import path from 'path'
import * as vscode from 'vscode'
import { ELECTRON_INSTALL_PATH, OUTPUT_CHANNEL, ELECTRON_ENV_VARS, DATA_NODE } from './api'

@singleton()
export class ElectronInstaller {

    private _latestVersion: string = "";

    private installedVersions: string[] = []

    private checkedInstalledVersions = false

    private installedMap: Map<string, string> = new Map()

    private installedMapInitialized = false

    public constructor(
        @inject(ELECTRON_INSTALL_PATH) private installPath: string,
        @inject(OUTPUT_CHANNEL) private output: vscode.OutputChannel,
        @inject(ELECTRON_ENV_VARS) private envVars: DATA_NODE
    ) {}

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
     * set latest version
     *
     */
    set latestVersion(version: string) {
        this._latestVersion = version
    }

    /**
     * resolve latest version
     *
     */
    get latestVersion(): string {
        return this._latestVersion;
    }

    /**
     * install electron
     *
     */
    async install(version?: string): Promise<string> {

        const installedVersions: string[] = await this.versions
        const requiredVersion = version || await this.latestRelease()
        this.output.appendLine(`required version ${requiredVersion}`)
        const install = installedVersions.indexOf(requiredVersion) === -1

        if (install) {
            this.output.show()

            const installDir  = path.resolve(__dirname, this.installPath + '_' + requiredVersion)
            this.output.appendLine(`install directory ${requiredVersion}`)
            const downloadUrl = this.resolveDownloadUrl(requiredVersion)

            fs.mkdirSync(installDir)

            await this.downloadElectron(downloadUrl, installDir)
            await this.extractFile(installDir)
            this.finalizeInstallation(requiredVersion, installDir)

            this.output.appendLine('installation completed')
        }

        return requiredVersion
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
     * resolve electron command by passed version
     *
     */
    resolveElectronCommand(version?: string): string | undefined {
        const versionRequired = version ?? this.latestVersion;
        if (!this.installedMapInitialized) {
            const versionsPath = path.resolve(__dirname, 'versions')
            try {
                const data: {[key: string]: string} = JSON.parse(fs.readFileSync(versionsPath, {encoding: "utf8"}).toString())
                Object.keys(data).forEach((key) => this.installedMap.set(key, data[key]))
            } catch (error) {
                vscode.window.showErrorMessage(`could not find electron version ${versionRequired}`)
            }
            this.installedMapInitialized = true
        }
        return this.installedMap.get(versionRequired)
    }

    /**
     * check version is installed
     *
     */
    async validate(version?: string): Promise<boolean> {
        const versions = await this.versions;
        return versions.indexOf(version ?? this.latestVersion) > -1;
    }

    /**
     * download electron binary from github
     *
     */
    private async downloadElectron(url: string, directory: string): Promise<void> {

        this.output.appendLine(`Download from: ${url} ...`)

        const download    = await fetch(url)
        const filename    = `electron.zip`
        const fileStream  = fs.createWriteStream(path.join(directory, filename), {flags: 'wx'})

        download.body.pipe(fileStream)

        return new Promise((resolve, reject) => {
            fileStream.once('close', () => {
                this.output.appendLine(`Download completed`)
                resolve()
            })

            fileStream.once('error', (err) => {
                this.output.appendLine(`Error while downloading`)
                this.output.append(JSON.stringify(err, null, 2))
                reject()
            })
        })
    }

    /**
     * extract elctron binary
     *
     */
    private extractFile (directory: string): Promise<void> {
        const source = path.resolve(directory, `electron.zip`)
        const outDir = directory

        this.output.appendLine(`extract file: ${source} to ${outDir}`)

        return new Promise((resolve, reject) => {
            const childProcess = spawn("tar", ["-zxvf", source, "-C", outDir], {stdio: "ignore", env: this.envVars})
            childProcess.on("exit", (code) => code === 0 ? resolve() : reject())
        })
    }

    /**
     * finalize installation
     * write path.txt and delete electron.zip
     * 
     */
    private finalizeInstallation(version: string, directory: string): void {
        const zipFile = path.join(directory, 'electron.zip')
        const execPath = path.join(directory, this.resolvePlatformPath())

        this.output.appendLine(`Write to versions: ${execPath}`)
        this.writeVersion(version, execPath)
        this.installedVersions.push(version)

        this.output.appendLine(`Finalize installation: remove file ${zipFile}`)
        fs.unlinkSync(zipFile)
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

                this.installedMap.set(version, command)
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
     * build download url for electron
     * 
     */
    private resolveDownloadUrl(version: string): string {
        const baseUrl = `https://github.com/electron/electron/releases/download/`
        const downloadFile = `electron-${version}-${os.platform()}-x64.zip`
        return baseUrl + version + '/' + downloadFile
    }

    /**
     * get platform path for electron
     *
     */
    private resolvePlatformPath() {
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
     * write the path to executable binary into the path.txt
     *
     */
    private writeVersion(version: string, executablePath: string) {
        const versionsPath = path.resolve(__dirname, 'versions')
        let data;
        try {
            data = JSON.parse(fs.readFileSync(versionsPath, {encoding: "utf8"}).toString())
        } catch(error) {
            data = {}
        }

        data[version] = executablePath
        this.installedMap.set(version, executablePath)
        fs.writeFileSync(versionsPath, JSON.stringify(data, null, 2))
    }
}
