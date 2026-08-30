const {
  app,
  BrowserWindow,
} = require("electron");

const {
  spawn,
} = require("child_process");

const path =
  require("path");

const http =
  require("http");


let mainWindow =
  null;

let nextProcess =
  null;


const PORT =
  3000;

const HOST =
  "0.0.0.0";

const APP_URL =
  `http://localhost:${PORT}`;

const PROJECT_ROOT =
  path.resolve(
    __dirname,
    ".."
  );


// ============================================================
// CHECK WHETHER DJALLOWS FARM SERVER IS ALREADY RUNNING
// ============================================================

function checkServer() {
  return new Promise(
    (resolve) => {

      const request =
        http.get(
          APP_URL,
          (response) => {

            response.resume();

            resolve(true);
          }
        );


      request.on(
        "error",
        () => {
          resolve(false);
        }
      );


      request.setTimeout(
        1000,
        () => {

          request.destroy();

          resolve(false);
        }
      );

    }
  );
}


// ============================================================
// WAIT FOR LOCAL SERVER
// ============================================================

function waitForServer(
  timeout = 60000
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {

      const started =
        Date.now();


      const check =
        async () => {

          const ready =
            await checkServer();


          if (ready) {

            resolve();

            return;
          }


          if (
            Date.now() -
              started >
            timeout
          ) {

            reject(
              new Error(
                "Djallows Farm server did not start within the expected time."
              )
            );

            return;
          }


          setTimeout(
            check,
            500
          );
        };


      void check();

    }
  );
}


// ============================================================
// START NEXT.JS ON WINDOWS
// ============================================================

function startLocalServer() {

  /*
    Windows cannot reliably spawn npm.cmd directly
    from Electron with shell:false.

    We therefore start it through Windows cmd.exe.
  */

  const commandProcessor =
    process.env.ComSpec ||
    "C:\\Windows\\System32\\cmd.exe";


  const command =
    `npm.cmd run dev -- --hostname ${HOST} --port ${PORT}`;


  nextProcess =
    spawn(
      commandProcessor,
      [
        "/d",
        "/s",
        "/c",
        command,
      ],
      {
        cwd:
          PROJECT_ROOT,

        windowsHide:
          true,

        stdio:
          "ignore",

        shell:
          false,

        env: {
          ...process.env,
        },
      }
    );


  nextProcess.on(
    "error",
    (error) => {

      console.error(
        "Unable to start Djallows Farm local server:",
        error
      );
    }
  );


  nextProcess.on(
    "exit",
    (
      code,
      signal
    ) => {

      console.log(
        "Djallows Farm local server stopped.",
        {
          code,
          signal,
        }
      );
    }
  );
}


// ============================================================
// MAKE SURE SERVER IS AVAILABLE
// ============================================================

async function ensureServer() {

  const alreadyRunning =
    await checkServer();


  if (alreadyRunning) {

    return;
  }


  startLocalServer();


  await waitForServer();
}


// ============================================================
// CREATE DJALLOWS FARM WINDOW
// ============================================================

function createWindow() {

  mainWindow =
    new BrowserWindow({
      width:
        1440,

      height:
        900,

      minWidth:
        1100,

      minHeight:
        700,

      show:
        false,

      title:
        "Djallows Farm",

      icon:
        path.join(
          PROJECT_ROOT,
          "public",
          "djallows-logo.png"
        ),

      backgroundColor:
        "#edf3ef",

      autoHideMenuBar:
        true,

      webPreferences: {

        contextIsolation:
          true,

        nodeIntegration:
          false,

        sandbox:
          true,
      },
    });


  mainWindow.setMenuBarVisibility(
    false
  );


  void mainWindow.loadURL(
    APP_URL
  );


  mainWindow.once(
    "ready-to-show",
    () => {

      if (!mainWindow) {
        return;
      }


      mainWindow.show();

      mainWindow.maximize();
    }
  );


  mainWindow.on(
    "closed",
    () => {

      mainWindow =
        null;
    }
  );
}


// ============================================================
// START APPLICATION
// ============================================================

app.whenReady().then(
  async () => {

    try {

      await ensureServer();


      createWindow();


      app.on(
        "activate",
        () => {

          if (
            BrowserWindow
              .getAllWindows()
              .length === 0
          ) {

            createWindow();
          }

        }
      );

    } catch (error) {

      console.error(
        "Unable to start Djallows Farm:",
        error
      );


      app.quit();
    }

  }
);


// ============================================================
// CLOSE APPLICATION
// ============================================================

app.on(
  "window-all-closed",
  () => {

    if (
      process.platform !==
      "darwin"
    ) {

      app.quit();
    }

  }
);


// ============================================================
// STOP LOCAL SERVER WHEN APP CLOSES
// ============================================================

app.on(
  "before-quit",
  () => {

    if (
      nextProcess &&
      !nextProcess.killed
    ) {

      try {

        nextProcess.kill();

      } catch (
        error
      ) {

        console.error(
          "Unable to stop local server cleanly:",
          error
        );
      }
    }

  }
);

