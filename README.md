# nodequentsheets

This is a package that turns google sheets into a quasi node.js ORM. It uses the `google-api-nodejs-client` to authenticate with the google sheets API. It currently implements the Google service account for authentication, but future releases might incorporate other authentications.

At this point, you can pull data form a sheet, manipulate that data, then write it back. The downside to this format is that it primarily works through batch updating. Even if one row is manipulated, this package will clear the sheet, then readd all the rows. It assumes that there is a header row.

In order to better facilitate testing, nodequentsheets allows you to put the sheet ID of a `production` and a `developement` sheet and it gives you the option to set the mode to either development or production. In order to do this, you need to set .env (currently in the root of the package).

To use this package, you need to have a google service account and a google sheets document. You need to have the service account's credentials stored in a file named `credentials.json` in a directory named `storage`.

You can install this package using npm, `npm i nodequentsheets`

# Basic Usage

This package utilizes the `dotenv` npm package and requires you to set .env environment variables:
`DEV_ID="devSpreadsheetID"`
`PROD_ID="devSpreadsheetID"`

Once your environment variables are set you can load in the Sheets class and set your options:

```javascript
require("dotenv").config()
const Sheets = require("../src/Sheets")

const db = new Sheets({
    developmentId: process.env.DEV_ID,
    productionId: process.env.PROD_ID,
    serviceAccount: require("../storage/credentials.json"),
    useCache: true,
})
// Set the DB mode to true for a development sheet or false for a production sheet
db.setMode({ development: true })
// You can set a column in the spreadsheed to act like a primary column.
// Currently nodequentsheets assigns a numerical ID to each row in the spreadsheet when
// it is converted to an object and stored in the values property.
db.setPrimaryColumn("ID")

// Once the options are set you can initialize the Class, which will set up the Google Sheets
// Authentication
await db.init()

// Once the class is initiated, you can make a call to the Google Sheets API to pull the rows
// from the sheet, using various .where conditions.
// If no where conditions are assigned, you will retrieve all the values in the spreadsheet.
// Sheets transforms all header row values into lower case, with no special characters, and
// underscores instead of spaces, so make sure you search the columns based on the new criteria
const Sheet = (await db.table("sheetname"))
    .where({
        column: "name",
        operator: "=",
        value: "John",
    })
    .where({
        column: "primary_address",
        operator: "=",
        value: "123 Street Address",
    })

// Order By statements are also acceptable
const Sheet = (await db.table("sheetname")).orderBy({ column: "ID", direction: "desc" })

// You can also pass your own custom way of sorting:
const Sheet = (await db.table("sheetname")).orderByRaw((data) => {
    return data.sort((a, b) => {
        return a.ID - b.ID;
    }
})

// After you have populated the values in the class, you can loop through and manipulate each row
for (const row of Table.get()) {
    row.ID = Math.random(15)
}
Table.save()

```

# Creating Records

This example walks you through creating a development and a production sheet, and then inserting a new row into the developement sheet.
If you already have two sheets set up, then you can combine the previous step with this one. Just set the ids of both sheets, set the mode,
select the table, and then insert the new row.

Otherwise, if you want to create sheets dynamically and insert new rows, you can do so as follows.

```javascript
require("dotenv").config()
const Sheets = require("../src/Sheets")
const sleep = require("../src/functions").sleep

const db = new Sheets({
    serviceAccount: require("../storage/credentials.json"),
})

const init = async () => {
    const table = "Test Table"

    // Step 1: Initialize the Database with Development and Production Sheets
    // This will create two Google Sheets. The titles are the title of the spreadsheets, and
    // the "table" is the sheet name.
    await db.database({
        devTitle: "Test Dev", // Title of the development sheet
        prodTitle: "Test Prod", // Title of the production sheet
        table: table, // Table name in the sheet
        schema: {
            // The schema creates the "header" row and then sets the formate for each column below the header row.
            ID: String,
            Name: String,
            Age: Number,
            Address: String,
        },
    })

    // Step 2: Set the Mode to Development or Production.
    db.setMode({ development: true })

    // Step 3: Set the Primary Column for Row Uniqueness
    db.setPrimaryColumn("ID")

    // Step 4: Select the Table and Insert a New Row
    await db.table(table)
    await db.insert({
        ID: "1",
        Name: "John",
        Age: 30,
        Address: "123 Main St",
    })

    // Step 5: Save Changes to the Sheet
    await db.save()

    // Log the Database Object for Verification
    console.log(db)
}

init()
```
