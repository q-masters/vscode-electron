[![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square)](http://opensource.org/licenses/MIT)
[![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version-short/q-masters.electron-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=q-masters.electron-vscode)
[![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/downloads-short/q-masters.electron-vscode.svg)](https://marketplace.visualstudio.com/items?itemName=q-masters.electron-vscode)
[![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/installs-short/q-masters.electron-vscode.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=q-masters.electron-vscode)

# Install Electron via VSCode extension

Install or Executes Electon apps inside of vscode

## Motivation

If an extension is to be created which displays a dialog with the help of Electron, or is to call up a session cookie, this is currently only possible with great difficulty because it is not possible to install electron via the package.json.

1. Option we could deliver Electron which leads 
   1. to a very large extension and more importantly
   2. the electron binaries are OS specific. So if the extension developed on a Windows system then is electron for Windows inside and will not run on mac / linux.
2. Option Hope that Electron is installed globally, otherwise it won't work.
3. Option is to compile the app beforehand, but this must be done separately for Mac, Windows and Linux.

The aim of this extension is to solve precisely those problems.

1. It is checked whether an Electron is available (global) or with Mac whether it is installed under Applications.
2. If it is not installed, the OS-specific version of Electron is downloaded for Mac, Windows or Linux, thus ensuring platform independence.

Furthermore, javascript files can now be started directly via vscode in electron so the files no longer have to be compiled.

## Usage

This is more designed as a service, that means you can install electron but it will not help alot. These is an example how this could be used inside your extension @see [Vscode-Electron-Demo](https://github.com/q-masters/vscode-electron-demo) how this could be used inside an extension.

## Commands

|name|params|type|description|
|-|-|-|-|
|qmasters:electron.install|-|void|checks for a valid installation and install electron is nothing exists|
|qmasters:electron.run|string, \[...string\[\]\]|ChildProcess|filepath which should executed [@example](https://github.com/electron/electron-quick-start/blob/master/main.js), additional params which should passed to electron app|

## Development

- go into src directory
- npm install
- start extension via F5 inside of vscode
