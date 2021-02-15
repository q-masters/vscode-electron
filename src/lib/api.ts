import { InjectionToken } from "tsyringe";
import * as vscode from "vscode";

export const ELECTRON_INSTALL_PATH: InjectionToken<string> = Symbol(`electron download path`)
export const OUTPUT_CHANNEL: InjectionToken<vscode.OutputChannel> = Symbol(`Output channel`)
export const ELECTRON_ENV_VARS: InjectionToken<any> = Symbol(`Environment variables for spawn`)

export declare type DATA_NODE = {[key: string]:string}
export declare type EventParams = string[] | { version: string, args: string[] }