# Windows app

This is a window for the app in this repository. It is not the official Grok Bot app, and it is not MausBot.

The window starts the server on the same computer and opens it. Chat uses your xAI key. The graphics card is not used. Connected apps and the cloud computer stay off until you add those keys.

Each install keeps its own bots. Installing it on a notebook does not open the bots on your PC.

## Get the installer

1. Open the repository on GitHub.
2. Click **Actions**.
3. Click **Windows installer**.
4. Click **Run workflow**, then **Run workflow** again.
5. Wait until the yellow dot turns green. The first run can take several minutes.
6. Open that run and download the **Cruiseliner-Windows** artifact.
7. Unzip it. Run `Cruiseliner-Setup.exe`.

Windows may say the publisher is unknown, because the installer is not signed yet. Choose **More info**, then **Run anyway**, only if you downloaded it from this repository's Actions.

The app installs for your user. It does not ask for administrator rights.

## First open

1. Paste your xAI API key. Leave the other boxes empty.
2. Click **Save and open**.
3. Sign in with your email. That sign-in only works inside this window, on this computer.
4. You get one primary bot. Use **+** to add another, or import `teams/personal-crew.md`.

The key is stored in the app's private folder on this PC. To change it, press Alt to show the menu, then **Keys → Edit keys**.

If the window stays on the key page, the server did not start. The reason is in `server.log` next to the saved key, under `%APPDATA%\Cruiseliner`.
