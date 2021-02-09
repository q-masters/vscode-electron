//@ts-check
'use strict';
const path = require('path');

module.exports = {
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
    },
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
    mode: "production"
};
