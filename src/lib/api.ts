import { InjectionToken } from "tsyringe";
import * as vscode from "vscode";

export const ELECTRON_INSTALL_PATH: InjectionToken<string> = Symbol(`electron download path`)
export const ELECTRON_VERSION: InjectionToken<string> = Symbol(`electron version`)
export const OUTPUT_CHANNEL: InjectionToken<vscode.OutputChannel> = Symbol(`Output channel`)
