
import { inject, singleton } from 'tsyringe'
import { spawn } from "child_process"
import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import path from 'path'
import * as vscode from 'vscode'
import { ELECTRON_INSTALL_PATH, OUTPUT_CHANNEL, ELECTRON_ENV_VARS, DATA_NODE } from './api'
import { ElectronRepository } from './electron-repository'

@singleton()
export class ElectronInstaller {

    public constructor(
        @inject(ElectronRepository) private repository: ElectronRepository,
        @inject(ELECTRON_INSTALL_PATH) private installPath: string,
        @inject(OUTPUT_CHANNEL) private output: vscode.OutputChannel,
        @inject(ELECTRON_ENV_VARS) private envVars: DATA_NODE
    ) {}

    /**
     * install electron
     *
     */
    async install(version?: string): Promise<string> {

        const installedVersions: string[] = await this.repository.versions
        const requiredVersion = version || await this.repository.latestRelease()
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
            await this.finalizeInstallation(requiredVersion, installDir)

            this.output.appendLine('installation completed')
        }

        return requiredVersion
    }

    /**
     * check version is installed
     *
     */
    async validate(version?: string): Promise<boolean> {
        const versions = await this.repository.versions;
        return versions.indexOf(version ?? await this.repository.latestRelease()) > -1;
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
    private async finalizeInstallation(version: string, directory: string): Promise<void> {
        const zipFile = path.join(directory, 'electron.zip')
        const execPath = path.join(directory, this.repository.resolvePlatformPath())

        this.output.appendLine(`Write to versions: ${execPath}`)
        await this.repository.addVersion(version, execPath)

        this.output.appendLine(`Finalize installation: remove file ${zipFile}`)
        fs.unlinkSync(zipFile)
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
}
