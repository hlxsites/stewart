# Stewart Title
AEM Franklin Implementation for www.stewart.com

## Environments
- Preview: https://main--stewart--hlxsites.hlx.page/
- Live: https://main--stewart--hlxsites.hlx.live/
- Production: https://www.stewart.com/

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `helix-project-boilerplate` template and add a mountpoint in the `fstab.yaml`
1. Add the [helix-bot](https://github.com/apps/helix-bot) to the repository
1. Install the [Helix CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/helix-cli`
1. Start Franklin Proxy: `hlx up` (opens your browser at `http://localhost:3000`)
1. Open the `stewart` directory in your favorite IDE and start coding :)
