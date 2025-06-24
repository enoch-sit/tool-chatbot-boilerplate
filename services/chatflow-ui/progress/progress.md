# Progress

## start up init repo log (if git pull this from another computer, you need to repeat this step)

### Step code 00001

I initialized a new React application named `chatbot-app` using `npx create-react-app chatbot-app --template typescript`.

**Note:** `create-react-app` is deprecated. The official React documentation recommends modern frameworks like Next.js or Remix.

The command created the project structure and installed initial dependencies. However, it also reported 9 security vulnerabilities (3 moderate, 6 high). The log suggested running `npm audit fix --force`, which is a critical point. As detailed in the next step, blindly running this command can introduce breaking changes.

### Step code 00002

I've installed the necessary dependencies for the project. The process involved resolving a dependency conflict with TypeScript.

Initially, installing `react-i18next` failed due to a requirement for a newer TypeScript version.

```bash
# This command failed initially
c:\your-folder\tool-chatbot-boilerplate\services\chatflow-ui\chatbot-app>npm install react-i18next i18next i18next-browser-languagedetector
```

I resolved this by upgrading TypeScript:

```bash
c:\your-folder\tool-chatbot-boilerplate\services\chatflow-ui\chatbot-app>npm install typescript@latest
```

Afterward, to fix security vulnerabilities, I ran `npm audit fix --force`.

**IMPORTANT:** This command incorrectly changed the `react-scripts` version in `package.json` to `"^0.0.0"`. This will break the `npm start`, `npm build`, and `npm test` commands.

```bash
c:\your-folder\tool-chatbot-boilerplate\services\chatflow-ui\chatbot-app>npm audit fix --force
npm warn audit Updating react-scripts to 0.0.0, which is a SemVer major change.
```

I will need to manually edit `package.json` to set `"react-scripts": "5.0.1"`, and then run `npm install` to fix this issue.

After resolving the dependency issues, I installed all the required packages from the guide:

Core dependencies:

```bash
npm install @mui/joy @emotion/react @emotion/styled
npm install react-router-dom zustand axios
npm install react-i18next i18next i18next-browser-languagedetector
npm install markdown-to-jsx mermaid prismjs
npm install @fontsource/inter
```

Development dependencies:

```bash
npm install -D @types/prismjs @types/react-router-dom
npm install -D msw jest @types/jest @testing-library/react @testing-library/jest-dom
```

All dependencies are now installed, but the `react-scripts` issue needs to be addressed before proceeding.

### Step code 00003

Install without any problem

### Step code 00004

1. Created [the file](../chatbot-app/setup_structure.bat)
2. And successfully executed
