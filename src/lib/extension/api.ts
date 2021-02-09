import { InjectionToken } from "tsyringe";
import * as vscode from "vscode";

export const OutputChannel: InjectionToken<vscode.OutputChannel> = Symbol('Extension Output Channel');
export const ElectronVersion: InjectionToken<string> = Symbol('Electron version');
export const ElectronInstallPath: InjectionToken<string> = Symbol('Electron install directory');
