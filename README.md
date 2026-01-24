# GitHub Copilot Office Add-in

A Microsoft Office add-in that integrates GitHub Copilot into Word, Excel, and PowerPoint.

## Getting Started

**👉 See [GETTING_STARTED.md](GETTING_STARTED.md) for setup instructions.**

The getting started guide walks you through running the add-in locally using the tray app. Standalone installers are in development and will be available once code signing is complete.

## Office Videos

### PowerPoint

https://github.com/user-attachments/assets/8ab56d45-32f7-46f1-a5c9-cc63824080c2

### Excel

https://github.com/user-attachments/assets/0e35378b-d917-4068-978a-63443597be24

### Word

https://github.com/user-attachments/assets/be8893b0-83a5-4447-b213-d2605d360131

## Project Structure

```
├── src/
│   ├── server.js          # Dev server (Vite + Express)
│   ├── server-prod.js     # Production server (static files)
│   ├── copilotProxy.js    # WebSocket proxy for Copilot SDK
│   └── ui/                # React frontend
├── dist/                  # Built frontend assets
├── certs/                 # SSL certificates for localhost
├── manifest.xml           # Office add-in manifest
├── installer/             # Installer resources (Electron Builder)
│   ├── macos/             # macOS post-install scripts
│   └── windows/           # Windows NSIS scripts
├── register.sh/.ps1       # Setup scripts (trust cert, register manifest)
└── unregister.sh/.ps1     # Cleanup scripts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run start` | Run production server standalone |
| `npm run start:tray` | Run Electron tray app locally |
| `npm run build` | Build frontend for production |
| `npm run build:installer` | Build installer for current platform |
| `npm run build:installer:mac` | Build macOS .dmg installer |
| `npm run build:installer:win` | Build Windows .exe installer |

## Unregistering Add-in

```bash
./unregister.sh      # macOS
.\unregister.ps1     # Windows
```

## Troubleshooting

### Add-in not appearing
1. Ensure the server is running: visit https://localhost:52390
2. Look for the GitHub Copilot icon in the system tray (Windows) or menu bar (macOS)
3. Restart the Office application
4. Clear Office cache and try again

### SSL Certificate errors
1. Re-run the register script or installer
2. Or manually trust `certs/localhost.pem`

### Service not starting after install
- **Windows**: Check Task Scheduler for "CopilotOfficeAddin"
- **macOS**: Run `launchctl list | grep copilot` and check `/tmp/copilot-office-addin.log`
