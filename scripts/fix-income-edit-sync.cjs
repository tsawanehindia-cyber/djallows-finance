/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const filePath =
  path.join(
    process.cwd(),
    "src",
    "app",
    "income",
    "page.tsx"
  );

let content =
  fs.readFileSync(
    filePath,
    "utf8"
  )
  .replace(/\r\n/g, "\n");


const startMarker =
`      const updatedTransaction:
        IncomeTransaction = {`;


const endMarker =
`      setEditingTransaction(
        null
      );`;


const start =
  content.indexOf(
    startMarker
  );


const end =
  content.indexOf(
    endMarker,
    start
  );


if (
  start === -1 ||
  end === -1
) {

  throw new Error(
    "Income edit refresh section could not be found. Nothing was changed."
  );
}


const replacement =
`      // Reload directly from the local SQLite API after editing.
      // This keeps the screen exactly in sync with the database,
      // including Reference and Note.

      const refreshResponse =
        await fetch(
          "/api/local/income",
          {
            cache:
              "no-store",
          }
        );


      const refreshData =
        (await refreshResponse.json()) as {
          success?: boolean;
          error?: string;

          transactions?:
            IncomeTransaction[];
        };


      if (
        !refreshResponse.ok ||
        !refreshData.success
      ) {

        throw new Error(
          refreshData.error ||
            "The income was saved, but the screen could not be refreshed."
        );
      }


      setTransactions(
        refreshData.transactions ??
        []
      );


`;


content =
  content.slice(
    0,
    start
  ) +
  replacement +
  content.slice(
    end
  );


fs.writeFileSync(
  filePath,
  content,
  "utf8"
);


console.log("");
console.log(
  "INCOME EDIT SCREEN SYNC FIXED"
);

console.log(
  "Save Changes now reloads directly from SQLite"
);

console.log(
  "Reference and Note will remain in sync"
);

console.log(
  "Database: unchanged"
);