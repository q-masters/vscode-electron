import { container, singleton } from "tsyringe"
import * as fs from "fs"
import * as path from "path"
import { OUTPUT_CHANNEL } from "./api"

@singleton()
export class ElectronUsage {

    /**
     * pending updates
     *
     */
    private updates: string[] = []

    /**
     * flag update is in progress
     *
     */
    private isUpdateInProgress = false

    /**
     * usage we have checked allready
     *
     */
    private usageChecked: Set<string> = new Set()

    /**
     * little queue to update usages
     *
     */
    async updateUsage(version?: string) {

        if (!version || this.usageChecked.has(version)) {
            return
        }

        this.updates.push(version);

        if (!this.isUpdateInProgress) {
            this.isUpdateInProgress = true
            while(this.updates.length) {
                const update = this.updates.shift() as string
                await this.updateUsageData(update)
            } 
            this.isUpdateInProgress = false
        }
    }

    /**
     * resolve all electron versions which was not used for at least 2 weeks
     */
    resolveUnusedElectronVersions(): Promise<any> {

        const out = container.resolve(OUTPUT_CHANNEL);

        return this.readUsageData()
            .then((data) => {

                out.appendLine(JSON.stringify(data) ?? "no data found")

                if (data === undefined) {
                    return []
                }

                const now = new Date()
                const result = Object.keys(data).filter((version) => {
                    const usedOn = new Date(data[version])
                    const today = parseInt(now.getFullYear() + '' + now.getMonth() + '' + now.getDate(), 10)
                    const last  = parseInt(usedOn.getFullYear() + '' + usedOn.getMonth() + '' + usedOn.getDate(), 10)
                    return now > usedOn
                })

                out.appendLine(JSON.stringify(result.toString()) ?? "no data found")
                return result
            })
            .catch(() => [])
    }

    /**
     * remove unused electron versions
     *
     */
    removeUnused(versions: string[]): Promise<boolean> {
        return this.readUsageData()
            .then((data) => {
                const newData = {...data}
                for (let i = 0, ln = versions.length; i < ln;  i++) {
                    delete newData[versions[i]]
                }
                return newData
            })
            .then((data) => this.writeUsage(JSON.stringify(data, null , 2)))
            .catch(() => false)
    }

    /**
     * update usage
     *
     */
    private updateUsageData(version: string): Promise<boolean> {
        const usageData: {[key: string]: string} = {}

        return this.readUsageData()
            .catch(() => ({}))
            .then((used) => {
                const data = used ?? usageData
                const updatedData = {...data}
                updatedData[version] = new Date().toISOString()

                this.usageChecked.add(version)
                return this.writeUsage(JSON.stringify(updatedData, null, 2))
            })
    }

    /**
     * read usage data
     * 
     */
    private readUsageData(): Promise<{[key: string]: string} | undefined> {
        const filePath = path.join(__dirname, `usage`)
        return new Promise<{[key: string]: string}>((resolve, reject) => {
            fs.stat(filePath, (err, stats) => {

                if (err || !stats.isFile()) {
                    reject("sag mal was soll das")
                    return
                }

                fs.readFile(filePath, { encoding: "utf-8"}, (error, data) => {
                    const usageData = JSON.parse(data)
                    error ? reject() : resolve(usageData)
                })
            })
        })
    }

    /**
     * write usage
     *
     */
    private writeUsage(data: string): Promise<boolean> {
        const filePath = path.join(__dirname, `usage`)

        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, data, {flag: "w+", encoding: "utf-8"}, (err) => {
                err ? reject() : resolve(true)
            })
        })
    }
}
