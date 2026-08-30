/* eslint-disable @typescript-eslint/no-require-imports */

const fs =
  require("node:fs");

const path =
  require("node:path");


const root =
  process.cwd();


const newIncomePath =
  path.join(
    root,
    "src",
    "app",
    "income",
    "new",
    "page.tsx"
  );


const incomePath =
  path.join(
    root,
    "src",
    "app",
    "income",
    "page.tsx"
  );


let newIncome =
  fs.readFileSync(
    newIncomePath,
    "utf8"
  );


let income =
  fs.readFileSync(
    incomePath,
    "utf8"
  );


// ============================================================
// ADD INCOME AMOUNT
// ============================================================

const oldNewAmount =
`                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={
                      amount
                    }
                    onChange={(
                      event
                    ) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"`;


const newNewAmount =
`                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={
                      amount
                    }
                    onChange={(
                      event
                    ) => {
                      const value =
                        event.target.value;

                      if (
                        /^\\d*(\\.\\d{0,2})?$/.test(
                          value
                        )
                      ) {
                        setAmount(
                          value
                        );
                      }
                    }}
                    placeholder="0.00"`;


if (
  !newIncome.includes(
    oldNewAmount
  )
) {
  throw new Error(
    "Add Income amount field was not found. Nothing was changed."
  );
}


newIncome =
  newIncome.replace(
    oldNewAmount,
    newNewAmount
  );


// ============================================================
// EDIT INCOME AMOUNT
// ============================================================

const oldEditAmount =
`                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        editAmount
                      }
                      onChange={(
                        event
                      ) =>
                        setEditAmount(
                          event.target.value
                        )
                      }
                      className=`;


const newEditAmount =
`                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        editAmount
                      }
                      onChange={(
                        event
                      ) => {
                        const value =
                          event.target.value;

                        if (
                          /^\\d*(\\.\\d{0,2})?$/.test(
                            value
                          )
                        ) {
                          setEditAmount(
                            value
                          );
                        }
                      }}
                      className=`;


if (
  !income.includes(
    oldEditAmount
  )
) {
  throw new Error(
    "Edit Income amount field was not found. Nothing was changed."
  );
}


income =
  income.replace(
    oldEditAmount,
    newEditAmount
  );


// ============================================================
// WRITE
// ============================================================

fs.writeFileSync(
  newIncomePath,
  newIncome,
  "utf8"
);


fs.writeFileSync(
  incomePath,
  income,
  "utf8"
);


console.log("");
console.log(
  "INCOME AMOUNT SCROLL FIX APPLIED"
);

console.log(
  "Add Income: mouse wheel cannot change amount"
);

console.log(
  "Edit Income: mouse wheel cannot change amount"
);