# Debugging Your TypeScript App in Docker: A Comprehensive's Guide

When you run your TypeScript application inside Docker for development, you'll want to be able to debug it from VS Code. This means setting breakpoints in your `.ts` files and having the debugger stop there, even though Docker is running compiled JavaScript (`.js` files).

Here's a breakdown of the important pieces:

## 1. The Big Picture: TypeScript to JavaScript

*   You write code in TypeScript (`.ts`).
*   Before your app can run, TypeScript needs to be compiled into JavaScript (`.js`). This is usually done with a command like `npm run build` which uses `tsc` (the TypeScript Compiler).
*   Docker runs this compiled JavaScript.

## 2. Telling the Compiler What to Do: `tsconfig.json`

This file is the instruction manual for the TypeScript compiler. Two settings are super important for debugging and how your files are organized:

*   `"outDir": "./dist"`: This tells the compiler to put all the compiled JavaScript files into a folder named `dist`.
*   `"rootDir": "./"`: This is a bit tricky but crucial.
    *   If `rootDir` is `"./"` (meaning your project's main folder), then the folder structure *inside* your `src` folder will be copied into the `dist` folder.
        *   Example: `src/server.ts` becomes `dist/src/server.js`.
        *   Example: `src/api/users.ts` becomes `dist/src/api/users.js`.
    *   If `rootDir` were `"./src"`, then the `src` part itself wouldn't be copied into `dist`.
        *   Example: `src/server.ts` would become `dist/server.js`.

    **Why does this matter?** Your `Dockerfile` (which tells Docker how to build and run your app) needs to know where the main JavaScript file is. If your `CMD` in the `Dockerfile` is `node dist/src/server.js`, then your `tsconfig.json` *must* be set up to create that `dist/src/server.js` file. This usually means `rootDir` should be `"./"`.

*   `"sourceMap": true`: This tells the compiler to generate "map" files (`.js.map`). These map files are like a treasure map, telling the debugger how a line in your compiled JavaScript corresponds back to a line in your original TypeScript code. **Essential for breakpoints to work!**

## 3. Running in Docker: `Dockerfile` and `docker-compose.yml`

*   **`Dockerfile`**:
    *   It builds your application (compiles TypeScript to JavaScript).
    *   The `CMD` instruction tells Docker how to start your app. For example: `CMD ["node", "dist/src/server.js"]`. This path must match what your `tsconfig.json` produces.

*   **`docker-compose.yml`**:
    *   **Exposing Debug Port**: You need to tell Docker to let your computer talk to the Node.js debugger running inside the container. You do this by mapping a port:
        ```yaml
        ports:
          - "3001:3001"      # Your app's port
          - "9229:9229"      # The Node.js debug port
        ```
    *   **Starting Node.js in Debug Mode**: You need to tell Node.js to start listening for a debugger. You do this in the `command` for your service:
        ```yaml
        command: node --inspect=0.0.0.0:9229 dist/src/server.js
        ```
        The `--inspect=0.0.0.0:9229` part is key.

## 4. Connecting VS Code: `launch.json`

This file tells VS Code how to attach its debugger to your app running in Docker.

*   **`type": "node"` and `"request": "attach"`**: Tells VS Code to attach to an already running Node.js process.
*   **`"port": 9229`**: The debug port VS Code should connect to (must match what's in `docker-compose.yml`).
*   **`"address": "localhost"`**: Where to find the debug port.
*   **`"localRoot": "${workspaceFolder}"`**: The folder open in VS Code (your project).
*   **`"remoteRoot": "/usr/src/app"`**: The main folder where your app code lives *inside* the Docker container (often set by `WORKDIR` in your `Dockerfile`).
*   **`"sourceMapPathOverrides"`**: This is the magic that makes breakpoints work! It tells VS Code how to match file paths from the source maps (which refer to paths *inside* the Docker container) to the actual TypeScript files on your computer.
    *   A common one: `"/usr/src/app/src/*": "${workspaceFolder}/src/*"`
        *   This means: "If a source map says the original file was at `/usr/src/app/src/somefile.ts` (inside Docker), then look for it at `your-project-folder/src/somefile.ts` (on your computer)."

## In Short:

1.  Configure `tsconfig.json` with `rootDir: "./"` (usually) and `sourceMap: true` so your compiled JS in `dist/` has the `src/` structure and map files.
2.  Make sure your `Dockerfile` `CMD` points to the correct path (e.g., `dist/src/server.js`).
3.  In `docker-compose.yml`, expose port `9229` and start Node with `--inspect`.
4.  In `launch.json`, set up the attach configuration with correct ports and `sourceMapPathOverrides`.

When these pieces are aligned, you can set breakpoints in your `.ts` files in VS Code, and the debugger will correctly pause execution inside the Docker container!
```// filepath: c:\Users\user\Documents\ThankGodForJesusChrist\ThankGodForTools\tool-chatbot-boilerplate\services\accounting-service\learn\src-Dir-config.md
# Debugging Your TypeScript App in Docker: A Newbie's Guide

When you run your TypeScript application inside Docker for development, you'll want to be able to debug it from VS Code. This means setting breakpoints in your `.ts` files and having the debugger stop there, even though Docker is running compiled JavaScript (`.js` files).

Here's a breakdown of the important pieces:

## 1. The Big Picture: TypeScript to JavaScript

*   You write code in TypeScript (`.ts`).
*   Before your app can run, TypeScript needs to be compiled into JavaScript (`.js`). This is usually done with a command like `npm run build` which uses `tsc` (the TypeScript Compiler).
*   Docker runs this compiled JavaScript.

## 2. Telling the Compiler What to Do: `tsconfig.json`

This file is the instruction manual for the TypeScript compiler. Two settings are super important for debugging and how your files are organized:

*   `"outDir": "./dist"`: This tells the compiler to put all the compiled JavaScript files into a folder named `dist`.
*   `"rootDir": "./"`: This is a bit tricky but crucial.
    *   If `rootDir` is `"./"` (meaning your project's main folder), then the folder structure *inside* your `src` folder will be copied into the `dist` folder.
        *   Example: `src/server.ts` becomes `dist/src/server.js`.
        *   Example: `src/api/users.ts` becomes `dist/src/api/users.js`.
    *   If `rootDir` were `"./src"`, then the `src` part itself wouldn't be copied into `dist`.
        *   Example: `src/server.ts` would become `dist/server.js`.

    **Why does this matter?** Your `Dockerfile` (which tells Docker how to build and run your app) needs to know where the main JavaScript file is. If your `CMD` in the `Dockerfile` is `node dist/src/server.js`, then your `tsconfig.json` *must* be set up to create that `dist/src/server.js` file. This usually means `rootDir` should be `"./"`.

*   `"sourceMap": true`: This tells the compiler to generate "map" files (`.js.map`). These map files are like a treasure map, telling the debugger how a line in your compiled JavaScript corresponds back to a line in your original TypeScript code. **Essential for breakpoints to work!**

## 3. Running in Docker: `Dockerfile` and `docker-compose.yml`

*   **`Dockerfile`**:
    *   It builds your application (compiles TypeScript to JavaScript).
    *   The `CMD` instruction tells Docker how to start your app. For example: `CMD ["node", "dist/src/server.js"]`. This path must match what your `tsconfig.json` produces.

*   **`docker-compose.yml`**:
    *   **Exposing Debug Port**: You need to tell Docker to let your computer talk to the Node.js debugger running inside the container. You do this by mapping a port:
        ```yaml
        ports:
          - "3001:3001"      # Your app's port
          - "9229:9229"      # The Node.js debug port
        ```
    *   **Starting Node.js in Debug Mode**: You need to tell Node.js to start listening for a debugger. You do this in the `command` for your service:
        ```yaml
        command: node --inspect=0.0.0.0:9229 dist/src/server.js
        ```
        The `--inspect=0.0.0.0:9229` part is key.

## 4. Connecting VS Code: `launch.json`

This file tells VS Code how to attach its debugger to your app running in Docker.

*   **`type": "node"` and `"request": "attach"`**: Tells VS Code to attach to an already running Node.js process.
*   **`"port": 9229`**: The debug port VS Code should connect to (must match what's in `docker-compose.yml`).
*   **`"address": "localhost"`**: Where to find the debug port.
*   **`"localRoot": "${workspaceFolder}"`**: The folder open in VS Code (your project).
*   **`"remoteRoot": "/usr/src/app"`**: The main folder where your app code lives *inside* the Docker container (often set by `WORKDIR` in your `Dockerfile`).
*   **`"sourceMapPathOverrides"`**: This is the magic that makes breakpoints work! It tells VS Code how to match file paths from the source maps (which refer to paths *inside* the Docker container) to the actual TypeScript files on your computer.
    *   A common one: `"/usr/src/app/src/*": "${workspaceFolder}/src/*"`
        *   This means: "If a source map says the original file was at `/usr/src/app/src/somefile.ts` (inside Docker), then look for it at `your-project-folder/src/somefile.ts` (on your computer)."

## In Short:

1.  Configure `tsconfig.json` with `rootDir: "./"` (usually) and `sourceMap: true` so your compiled JS in `dist/` has the `src/` structure and map files.
2.  Make sure your `Dockerfile` `CMD` points to the correct path (e.g., `dist/src/server.js`).
3.  In `docker-compose.yml`, expose port `9229` and start Node with `--inspect`.
4.  In `launch.json`, set up the attach configuration with correct ports and `sourceMapPathOverrides`.

When these pieces are aligned, you can set breakpoints in your `.ts` files in VS Code, and the debugger will correctly pause execution inside