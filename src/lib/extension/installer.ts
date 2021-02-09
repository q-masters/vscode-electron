
import { inject, InjectionToken, singleton } from 'tsyringe'
import { spawn, exec } from "child_process"
import fetch from 'node-fetch'
import fs from 'fs'
import os from 'os'
import path from 'path'
import readline from "readline"

export const ELECTRON_INSTALL_PATH: InjectionToken<string> = Symbol(`electron download path`)
export const ELECTRON_VERSION: InjectionToken<string> = Symbol(`electron version`)

@singleton()
export class ElectronInstaller {

    public constructor(
        @inject(ELECTRON_VERSION) private version: string,
        @inject(ELECTRON_INSTALL_PATH) private installPath: string
    ) {}

    /**
     * install electron
     *
     */
    public async install(): Promise<void> {
        const isAvailable = await this.isElectronAvailable()

        if (!isAvailable) {
            const installDir = path.resolve(__dirname, this.installPath)
            if (!fs.existsSync(installDir)) {
                fs.mkdirSync(installDir)
            }

            await this.downloadElectron()
            await this.extractFile()
            await this.finalizeInstallation()
        }
    }

    /**
     * validate electron installation
     *
     */
    public async validateInstallation() {

        const installDir = path.resolve(__dirname, this.installPath)
        const electronCommand = await this.resolveElectronCommand()

        if (!electronCommand) {
            return false
        }

        const versionFilePath = path.resolve(installDir, "version")
        if (!fs.existsSync(versionFilePath) || fs.statSync(versionFilePath).isFile) {
            return false
        }

        const version = await this.readElectronVersion()
        return version === this.version
    }

    /**
     * get current electron version
     *
     */
    private async readElectronVersion(): Promise<string | null> {
        return new Promise((resolve, reject) => {
            const versionFile = path.resolve(__dirname, this.installPath, 'version')

            if (!fs.existsSync(versionFile) || fs.statSync(versionFile).isFile) {
                return null
            }

            const rs = fs.createReadStream(versionFile, {encoding: 'utf8'})
            const line = readline.createInterface(rs)

            line.on("line", (version) => resolve(version))
        })
    }

    /**
     * get path from our installed electron
     *
     */
    public resolveElectronCommand(): Promise<string | null> {

        return new Promise((resolve, reject) => {
            const pathFile = path.resolve(__dirname, 'path.txt')

            if (!fs.existsSync(pathFile) || !fs.statSync(pathFile).isFile) {
                return resolve(null)
            }

            const rs = fs.createReadStream(pathFile, {encoding: 'utf8'})
            const line = readline.createInterface(rs)

            line.on("line", (command) => {
                line.close()
                rs.close()

                resolve(command)
            })
        })
    }

    /**
     * download electron binary from github
     *
     */
    private async downloadElectron(): Promise<void> {

        console.log(`Start download from: ${this.resolveDownloadUrl()} ${os.EOL}`)

        const download    = await fetch(this.resolveDownloadUrl())
        const filename    = `electron.zip`
        const fileStream  = fs.createWriteStream(path.join(__dirname, this.installPath, filename), {flags: 'wx' })

        download.body.pipe(fileStream)

        return new Promise((resolve) => {
            fileStream.once('close', () => {
                resolve()
            })

            fileStream.once('error', (err) => console.log(err))
        })
    }

    /**
     * finalize installation
     * write path.txt and delete electron.zip
     * 
     */
    public async finalizeInstallation(): Promise<void> {
        return new Promise((resolve) => {
            this.writeExecutablePath(path.join(__dirname, this.installPath, this.resolvePlatformPath()))
            fs.unlinkSync(path.join(__dirname, this.installPath, 'electron.zip'))
        })
    }

    /**
     * build download url for electron
     * 
     */
    private resolveDownloadUrl(): string {
        const baseUrl = `https://github.com/electron/electron/releases/download`
        const downloadFile = `electron-v${this.version}-${os.platform()}-x64.zip`
        return baseUrl + '/v' + this.version + '/' + downloadFile
    }
    
    /**
     * extract elctron binary
     *
     */
    private extractFile (): Promise<void> {

        const source = path.resolve(__dirname, this.installPath, `electron.zip`)
        const outDir = path.join(__dirname, this.installPath)

        return new Promise((resolve, reject) => {
            const childProcess = spawn("tar", ["-zxvf", source, "-C", outDir], {stdio: "inherit"})
            childProcess.on("exit", (code) => code === 0 ? resolve() : reject())
        })
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
     * check we have an running electron version, first check the path.txt command
     * if this not exists or is just empty we try global electron installation
     *
     */
    private async isElectronAvailable(): Promise<boolean> {

        const command = await this.resolveElectronCommand()
        const available = await new Promise<boolean>((resolve) => {
            exec(`${command ?? `electron`} --version`, (err) => {
                if (!err && !command) {
                    const command  = os.platform() === 'win32' ? 'electron.cmd' : 'electron'
                    this.writeExecutablePath(command)
                }
                resolve(err === null)
            })
        })

        /** only for mac check if not found we can find it in /Applications */
        if (!available && os.platform() === 'darwin') {
            const applicationsPath = path.resolve('/Applications', this.resolvePlatformPath())

            if (fs.existsSync(applicationsPath) && fs.statSync(applicationsPath).isFile()) {
                this.writeExecutablePath(applicationsPath)
                return true
            }
        }

        return available
    }

    /**
     * write the path to executable binary into the path.txt
     *
     */
    private writeExecutablePath(location: string) {
        const pathTxt = path.resolve(__dirname, 'path.txt')
        const pathTxt$ = fs.createWriteStream(pathTxt)
        pathTxt$.write(location)
        pathTxt$.close()
    }
}