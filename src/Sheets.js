const { google } = require("googleapis")
const { JWT } = require("google-auth-library")
const sleep = require("./functions").sleep

class Sheets {
    constructor(
        {
            developmentId: devId,
            productionId: prodId,
            serviceAccount: account,
            useCache: cache = false,
            mode = "Production",
            primaryColumn = "ID",
        } = {} // Default empty object to prevent errors
    ) {
        // Validate required parameters
        if (!account || !devId || !prodId) {
            throw new Error("Service account credentials, developmentId, and productionId are required.")
        }

        // Assign constructor parameters
        this._account = account
        this.devId = devId
        this.prodId = prodId

        // Mode can be dynamically set (Development or Production)
        this.mode = mode
        this.id = mode === "Development" ? this.devId : this.prodId

        // Primary column for referencing rows
        this.primaryColumn = primaryColumn

        // Define Google Sheets API URL scopes
        this.api = ["https://www.googleapis.com/auth/spreadsheets"]

        // Initialize other properties
        this.client = null // Will be set when client is authenticated
        this.query = ""
        this.selectedTable = ""

        this.useCache = cache
        this.header = []
        this.results = []
        this.values = []
    }

    // Private method to initialize the client
    async _initClient() {
        const auth = new google.auth.JWT(
            this._account.client_email, // Service account email
            null, // Key file is null since we're using the key directly
            this._account.private_key, // Service account private key
            this.api // Scopes for Google Sheets
        )

        try {
            // Authenticate the client
            await auth.authorize()
            this.client = google.sheets({ version: "v4", auth }) // Set the sheets client
            console.log("Google Sheets API client initialized successfully.")
        } catch (error) {
            console.error("Failed to authenticate Google Sheets API client:", error)
        }
    }

    /**
     * Sets the primary column of the sheet based on the provided parameter.
     * This column will be used as a unique identifier (e.g., primary key).
     *
     * @param {string} col - The column name to set as the primary column.
     * @return {this} The current instance with the updated primary column.
     */
    setPrimaryColumn(col) {
        if (!col || typeof col !== "string") {
            throw new Error("Invalid column name provided. It must be a non-empty string.")
        }

        this.primaryColumn = col
        console.log(`Primary column set to: ${this.primaryColumn}`)

        return this // Return the current instance for method chaining
    }

    /**
     * Returns the primary column of the object.
     *
     * @return {string} The primary column of the object.
     */
    getPrimaryColumn() {
        return this.primaryColumn
    }

    /**
     * Sets the mode of the object to either Development or Production.
     *
     * @param {Object} options - Configuration options for setting the mode.
     * @param {boolean} [options.development=false] - Boolean to indicate whether to use Development mode. Defaults to Production mode if false or not provided.
     * @return {void} - No return value.
     */
    setMode({ development = false } = {}) {
        try {
            // Set the mode and ID based on the development flag
            this.mode = development ? "Development" : "Production"
            this.id = development ? this.devId : this.prodId

            console.log(`Mode set to ${this.mode} (${this.id})`)
        } catch (error) {
            console.error("Error setting mode:", error)
            throw new Error("Failed to set mode. Ensure that devId and prodId are correctly set.")
        }
    }

    /**
     * Returns the current mode of the object.
     *
     * @return {string} The current mode of the object. Possible values are "Development" or "Production".
     */
    getMode() {
        return this.mode
    }

    /**
     * Initializes the Sheets object by setting up authentication, creating a Sheets client,
     * setting tables, and returning the initialized Sheets object.
     *
     * @return {Promise<Sheets>} The initialized Sheets object.
     */
    async init() {
        try {
            // Initialize Google Sheets API client
            await this._initClient()

            // Set tables or any other necessary data setup
            await this.setTables()

            console.log("Sheets object initialized successfully.")

            // Return the current Sheets instance
            return this
        } catch (error) {
            console.error("Failed to initialize Sheets object:", error)
            throw new Error("Error initializing Sheets object.")
        }
    }

    /**
     * Retrieves the titles of all sheets in the spreadsheet and sets the `tables` property
     * of the current instance.
     *
     * @return {Promise<this>} A Promise that resolves to the current instance.
     */
    async setTables() {
        try {
            // Retrieve the sheet titles from the specified spreadsheet
            const { data } = await this.client.spreadsheets.get({
                spreadsheetId: this.id,
                fields: "sheets.properties.title",
            })

            // Check if sheets data exists
            if (!data || !data.sheets) {
                throw new Error("No sheets data found in the spreadsheet.")
            }

            // Set the tables property with the sheet titles
            this.tables = data.sheets.map((sheet) => sheet.properties.title)

            console.log("Sheet titles successfully retrieved and set.")

            return this // Return the current instance
        } catch (error) {
            console.error("Failed to retrieve sheet titles:", error)
            throw new Error("Error fetching sheet titles from the spreadsheet.")
        }
    }

    /**
     * Sets the selected table (sheet) and retrieves its values.
     *
     * @param {string} table - The name of the table (sheet) to select.
     * @return {Promise<this>} - A Promise that resolves to the current instance.
     */
    async table(table) {
        try {
            // Validate that a valid table name is provided
            if (!table || typeof table !== "string") {
                throw new Error("Invalid table name provided. It must be a non-empty string.")
            }

            // Check if the provided table exists in the list of available tables
            if (!this.tables || !this.tables.includes(table)) {
                throw new Error(
                    `Table '${table}' not found in available tables. Please ensure it's a valid sheet name.`
                )
            }

            // Set the selected table and retrieve its values
            this.selectedTable = table
            await this.setValues() // This method fetches the values of the selected sheet

            console.log(`Table '${table}' selected and values retrieved.`)
            return this // Return the current instance for method chaining
        } catch (error) {
            console.error("Failed to set table and retrieve values:", error)
            throw new Error(`Error selecting table '${table}': ${error.message}`)
        }
    }

    /**
     * Sets the values of the Sheets instance by fetching data from the selected table.
     * Maps the header row as keys and the subsequent rows as values.
     *
     * @return {Promise<this>} The Sheets instance with updated values.
     */
    async setValues() {
        try {
            // Ensure the selected table is valid
            if (!this.selectedTable) {
                throw new Error("No table selected. Please select a table before setting values.")
            }

            // Fetch the data from the selected table
            const { data } = await this.client.spreadsheets.values.get({
                spreadsheetId: this.id,
                range: this.selectedTable,
            })

            // Ensure data exists
            if (!data || !data.values || data.values.length === 0) {
                throw new Error(`No data found in the table: '${this.selectedTable}'.`)
            }

            // Extract the header row and clean it up
            this.header = data.values.shift().map(
                (key) =>
                    key
                        .replace(/[^a-zA-Z0-9]/g, " ") // Replace non-alphanumeric characters with space
                        .replace(/\s+/g, "_") // Replace multiple spaces with an underscore
                        .toLowerCase() // Convert to lowercase for consistency
            )

            // Map the remaining rows to objects with the header keys
            const entries = data.values.map((row, index) => {
                const entry = this.header.reduce((obj, key, i) => {
                    obj[key] = row[i] ? row[i].trim() : "" // Assign values, default to empty string if undefined
                    return obj
                }, {})
                return { ...entry, primary_key: index + 1 } // Add primary_key field as index + 1
            })

            // Store the mapped values in the instance
            this.values = { [this.selectedTable]: entries }
            this.results = entries

            console.log(`Values set for table: '${this.selectedTable}' with ${entries.length} entries.`)
            return this // Return the instance for chaining
        } catch (error) {
            console.error("Error setting values:", error)
            throw new Error(`Failed to set values for table '${this.selectedTable}': ${error.message}`)
        }
    }
    /**
     * Sets the query object with the provided column, operator, and value,
     * then filters the results based on the query.
     *
     * @param {Object} options - An object containing the column, operator, and value.
     * @param {string} options.column - The column to filter by.
     * @param {string} options.operator - The comparison operator (e.g., '=', '!=', '>', '<', '>=', '<=', 'like').
     * @param {any} options.value - The value to compare against.
     * @return {this} The current instance after filtering.
     */
    where({ column, operator, value }) {
        if (!column || typeof column !== "string") {
            throw new Error("Invalid column name provided.")
        }

        const supportedOperators = ["=", "!=", ">", "<", ">=", "<=", "like"]

        if (!supportedOperators.includes(operator)) {
            throw new Error(
                `Unsupported operator '${operator}'. Supported operators are: ${supportedOperators.join(", ")}`
            )
        }

        // Set the query object
        this.query = { column, operator, value }

        // Perform the filtering
        this.filterResults()

        // Return the current instance for chaining
        return this
    }

    /**
     * Filters the results based on the current query.
     */
    filterResults() {
        const { column, operator, value } = this.query

        this.results = this.values[this.selectedTable].filter((row) => {
            const cellValue = row[column]

            switch (operator) {
                case "=":
                    return cellValue == value
                case "!=":
                    return cellValue != value
                case ">":
                    return cellValue > value
                case "<":
                    return cellValue < value
                case ">=":
                    return cellValue >= value
                case "<=":
                    return cellValue <= value
                case "like":
                    return typeof cellValue === "string" && cellValue.includes(value)
                default:
                    return false
            }
        })

        // Optionally log filtered results for debugging
        console.log(`Filtered results: ${this.results.length} entries matched.`)
    }
    /**
     * Returns each row in the `results` array with attached `update` and `delete` methods.
     * The `update` method allows updating fields of the row, and the `delete` method removes the row from the `results` array.
     *
     * @return {Array<any>} An array of each row of the `results` array with update and delete methods.
     */
    get() {
        return this.results.map((row) => ({
            ...row,

            // Method to delete the current row from results
            delete: () => this._deleteRow(row),

            // Method to update fields of the current row
            update: (updatedFields) => this._updateRow(row, updatedFields),
        }))
    }

    /**
     * Deletes a row from the `results` array.
     *
     * @param {Object} row - The row to delete.
     */
    _deleteRow(row) {
        const index = this.results.findIndex((r) => r.primary_key === row.primary_key)
        if (index !== -1) {
            this.results.splice(index, 1) // Remove the row from the results array
            console.log(`Row with primary_key ${row.primary_key} deleted.`)
        } else {
            console.warn(`Row with primary_key ${row.primary_key} not found for deletion.`)
        }
    }

    /**
     * Updates a row in the `results` array with the given fields.
     *
     * @param {Object} row - The row to update.
     * @param {Object} updatedFields - An object containing the fields to update.
     */
    _updateRow(row, updatedFields) {
        // Find the row in results based on primary_key
        const index = this.results.findIndex((r) => r.primary_key === row.primary_key)
        if (index !== -1) {
            // Merge the updated fields with the existing row data
            this.results[index] = {
                ...this.results[index],
                ...updatedFields,
            }
            console.log(`Row with primary_key ${row.primary_key} updated.`)
        } else {
            console.warn(`Row with primary_key ${row.primary_key} not found.`)
        }
    }
    /**
     * Returns the first element from the 'results' array without modifying the array.
     *
     * @return {Any} The first element from the 'results' array, or undefined if the array is empty.
     */
    first() {
        return this.results.length > 0 ? this.results[0] : undefined
    }

    /**
     * Retrieves the titles of all sheets in the spreadsheet and returns them.
     *
     * @return {Array} An array of sheet titles.
     */
    getTables() {
        return this.tables
    }
    /**
     * Sorts the `results` array based on the given `column` and `direction`.
     *
     * @param {Object} options - An object containing the `column` and `direction` to sort by.
     * @param {string} options.column - The column to sort by.
     * @param {string} [options.direction="asc"] - The direction of the sort. Can be either "asc" or "desc" (default is "asc").
     * @return {this} - The current instance with the sorted `results` array.
     */
    orderBy({ column, direction = "asc" }) {
        // Validate the provided column and direction
        if (!column || typeof column !== "string") {
            throw new Error("Invalid column name provided.")
        }

        if (!["asc", "desc"].includes(direction.toLowerCase())) {
            throw new Error('Invalid direction. Use "asc" or "desc".')
        }

        // Perform the sort
        this.results = this.results.sort((a, b) => {
            const aValue = a[column]
            const bValue = b[column]

            // Handle different data types for comparison
            if (typeof aValue === "string" && typeof bValue === "string") {
                return aValue.localeCompare(bValue, undefined, { sensitivity: "base" })
            } else if (aValue < bValue) {
                return -1
            } else if (aValue > bValue) {
                return 1
            }
            return 0
        })

        // Reverse the results if sorting in descending order
        if (direction === "desc") {
            this.results.reverse()
        }

        return this // Return the current instance for chaining
    }
    /**
     * Executes a callback function with the results as the argument and returns the current instance.
     * The callback function can manipulate the `results` array directly, allowing for custom sorting or transformations.
     *
     * @param {Function} callback - The function to be executed with the `results` array as the argument.
     * @return {this} The current instance.
     */
    orderByRaw(callback) {
        if (typeof callback !== "function") {
            throw new Error("Callback must be a function.")
        }

        // Execute the callback with the current results
        callback(this.results)

        // Return the current instance for chaining
        return this
    }

    /**
     * Inserts or upserts a row into the selected table.
     * If upsert: true is passed, it will check for an existing row based on the unique key
     * and update it if found, otherwise insert a new row.
     *
     * @param {Object} newRow - An object representing the new row or updated data.
     * @param {Object} options - An object containing the upsert option and unique key.
     * @param {Boolean} options.upsert - Whether to upsert (update if exists, insert if not). Default is false.
     * @param {String} options.uniqueKey - The unique key (e.g., "ID") to check for an existing row. Default is "ID".
     * @return {Promise<this>} - The current instance with the updated or inserted row.
     */
    async insert(newRow, { upsert = false, uniqueKey = "ID" } = {}) {
        try {
            // Ensure a table is selected
            if (!this.selectedTable) {
                throw new Error("No table selected.")
            }

            // Ensure the headers are available to map the object keys to the spreadsheet columns
            if (!this.header || this.header.length === 0) {
                throw new Error("Header is missing or empty.")
            }

            if (upsert) {
                // Find the existing row by the unique key
                const existingIndex = this.results.findIndex((row) => row[uniqueKey] === newRow[uniqueKey])

                if (existingIndex !== -1) {
                    // Update the existing row
                    this.results[existingIndex] = {
                        ...this.results[existingIndex],
                        ...newRow,
                    }
                    console.log(`Row with ${uniqueKey} ${newRow[uniqueKey]} updated.`)
                } else {
                    // Add new row if it doesn't exist
                    this.results.push(newRow)
                    console.log(`New row added with ${uniqueKey} ${newRow[uniqueKey]}.`)
                }

                // Remove all existing rows except the header row in the spreadsheet
                await this.client.spreadsheets.values.clear({
                    spreadsheetId: this.id,
                    range: `${this.selectedTable}!A2:Z`, // Clear all rows below the header (assumes header in row 1)
                })

                // Convert all rows in `this.results` to arrays in header order
                const allRowsArray = this.results.map((row) => this.header.map((col) => row[col] || ""))

                // Append all rows in `this.results` to the spreadsheet
                await this.client.spreadsheets.values.append({
                    spreadsheetId: this.id,
                    range: this.selectedTable,
                    valueInputOption: "RAW",
                    insertDataOption: "INSERT_ROWS",
                    resource: {
                        values: allRowsArray, // Insert the arrays representing all rows
                    },
                })

                console.log("All rows reinserted with updated data.")
                return this // Return the current instance for chaining
            } else {
                // Non-upsert: Simply add a new row
                const newRowArray = this.header.map((col) => newRow[col] || "")

                await this.client.spreadsheets.values.append({
                    spreadsheetId: this.id,
                    range: this.selectedTable,
                    valueInputOption: "RAW",
                    insertDataOption: "INSERT_ROWS",
                    resource: {
                        values: [newRowArray],
                    },
                })

                const primary_key = this.results.length + 1
                this.results.push({
                    ...newRow,
                    primary_key,
                })

                console.log(`New row inserted with primary_key ${primary_key}`)
                return this
            }
        } catch (error) {
            console.error("Error inserting/upserting row:", error)
            throw new Error("Failed to insert/upsert row.")
        }
    }
    /**
     * Saves the `results` array to the spreadsheet by updating the values of the selected table.
     *
     * This method iterates over the `results` array and updates the corresponding entries in the `values` array
     * for the selected table based on the `primary_key`. It merges the updated fields from the `results` into
     * the existing values and trims any excess fields to match the `header` length.
     * Finally, it updates the spreadsheet by calling the `updateSheets` method.
     *
     * @return {Promise<void>} A promise that resolves when the save operation is complete.
     */
    async save() {
        try {
            // Ensure there are results to save and a valid table is selected
            if (!this.results.length) {
                console.warn("No results to save.")
                return
            }

            if (!this.selectedTable || !this.values[this.selectedTable]) {
                throw new Error("Selected table is invalid or does not exist.")
            }

            // Iterate over results and update the corresponding values in the selected table
            this.results.forEach((result) => {
                const index = this.values[this.selectedTable].findIndex(
                    (value) => value.primary_key === result.primary_key
                )

                if (index !== -1) {
                    // Exclude the primary_key from being updated
                    const { primary_key, ...updatedResult } = result

                    // Merge the result into the existing value, ensuring no extra fields are added
                    this.values[this.selectedTable][index] = {
                        ...this.values[this.selectedTable][index],
                        ...updatedResult,
                    }

                    // Trim the result to match the number of columns in the header
                    this.values[this.selectedTable][index] = Object.fromEntries(
                        Object.entries(this.values[this.selectedTable][index]).slice(0, this.header.length)
                    )
                }
            })

            // Update the spreadsheet with the modified values
            await this.updateSheets()
            console.log("Spreadsheet updated successfully.")
        } catch (error) {
            console.error("Error saving data to spreadsheet:", error)
            throw new Error("Failed to save data.")
        }
    }

    /**
     * Updates the selected table in the spreadsheet with the latest values.
     *
     * This method first removes the `primary_key` from each row in the `values` array, prepares the data for update,
     * and clears the existing values of the selected table in the spreadsheet. Then, it updates the sheet with the
     * newly prepared values, including the header row at the top.
     *
     * @return {Promise<void>} A promise that resolves when the sheet has been updated.
     */
    async updateSheets() {
        try {
            // Ensure there are values to update and a valid table is selected
            if (!this.selectedTable || !this.values[this.selectedTable]) {
                throw new Error("No valid table selected or values are missing.")
            }

            // Prepare the values for updating by removing the `primary_key` and extracting values
            const updatedValues = this.values[this.selectedTable].map((value) => {
                const { primary_key, ...rest } = value // Remove primary_key from each row
                return Object.values(rest) // Convert the row to an array of values
            })

            // Add the header to the beginning of the values array
            updatedValues.unshift(this.header)

            // Clear the current values in the selected table on the spreadsheet
            await this.client.spreadsheets.values.clear({
                spreadsheetId: this.id,
                range: this.selectedTable,
            })

            // Update the sheet with the new values
            await this.client.spreadsheets.values.batchUpdate({
                spreadsheetId: this.id,
                requestBody: {
                    data: [
                        {
                            range: this.selectedTable,
                            values: updatedValues,
                        },
                    ],
                    valueInputOption: "RAW", // Values are input as raw data, no formatting applied
                },
            })

            console.log(`Sheet '${this.selectedTable}' updated successfully.`)
        } catch (error) {
            console.error("Error updating sheets:", error)
            throw new Error("Failed to update the sheet.")
        }
    }
}

module.exports = Sheets
