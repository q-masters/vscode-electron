//@ts-check
'use strict';

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const electonBaseConfiguration = {
    devtool: 'source-map',
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(process.cwd(), "./tsconfig.json")
                        }
                    }
                ]
            }
        ]
    }
};

const extension = {
    ...electonBaseConfiguration,
    externals: {
        vscode: 'commonjs vscode'
    },
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "vscode-electron.js",
        libraryTarget: 'commonjs2',
    },
    target: "node",
    entry: {
        "main": './lib/extension/main.ts'
    },
    mode: "development",
}

/**
 * webpack for electron main process, this is the file which
 * will started with electron
 */
const electronMainProcess = {
    ...electonBaseConfiguration,
    target: "electron-main",
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "electron-[name].js"
    },
    node: {
        __dirname: false
    },
    entry: {
        "main": './lib/electron/main/main.ts'
    },
    mode: "development"
};

/**
 * webpack for electron renderer process, this file would be included
 * into the index.html file
 */
const electronRendererProcess = {
    ...electonBaseConfiguration,
    output: {
        path: path.resolve(process.cwd(), 'dist'),
        filename: "renderer-[name].js"
    },
    target: "electron-renderer",
    entry: {
        "view": './lib/electron/renderer/main.ts'
    },
    mode: "development",
    plugins: [
        new HtmlWebpackPlugin({
            template: "./lib/electron/renderer/main.html"
        })
    ]
};

module.exports = [
    extension,
    electronMainProcess,
    electronRendererProcess
];
