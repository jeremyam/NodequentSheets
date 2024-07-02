const { google } = require("googleapis")
const { JWT } = require("google-auth-library")
const sleep = require("./functions").sleep

class Sheets {
    constructor(
        { developmentId: devId, productionId: prodId, serviceAccount: account, useCache: cache } = { useCache: false }
    ) {
        this._account = account
        this.devId = devId
        this.prodId = prodId
        this.id = ""
        this.mode = "Production"
        this.primaryColumn = "ID"
        this.api = ["https://www.googleapis.com/auth/spreadsheets"]
        this.client = ""
        this.query = ""
        this.selectedTable = ""
        this.useCache = cache
        this.header = []
        this.results = []
        this.values = []
    }

    /**
     * Sets the primary column of the sheet based on the provided parameter.
     *
     * @param {type} col - The column to set as the primary column.
     * @return {type} The current instance with the updated primary column.
     */
    setPrimaryColumn(col) {
        this.primaryColumn = col
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
     * Sets the mode of the object based on the provided parameter.
     *
     * @param {Object} options - An object containing the following properties:
     * @param {boolean} [development=false] - A boolean indicating whether the mode should be set to development or production.
     * @return {Promise<void>} - A promise that resolves when the mode has been set.
     */
    setMode({ development = false } = { development: false }) {
        this.id = development ? this.devId : this.prodId
        this.mode = development ? "Development" : "Production"
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
     * Initializes the Sheets object by setting authentication, creating a Sheets client,
     * setting tables, and returning the Sheets object.
     *
     * @return {Object} The initialized Sheets object.
     */
    async init() {
        const auth = new JWT(this._account.client_email, null, this._account.private_key, this.api)
        this.client = google.sheets({ version: "v4", auth })
        await this.setTables()
        return this
    }

    /**
     * Sets the selected table and retrieves its values.
     *
     * @param {string} table - The name of the table to set.
     * @return {Promise<Object>} - A Promise that resolves to the current instance.
     */
    async table(table) {
        this.selectedTable = table
        await this.setValues()
        return this
    }

    /**
     * Sets the query object with the provided column, operator, and value, then filters the results based on the query.
     *
     * @param {Object} column - The column to filter.
     * @param {string} operator - The comparison operator for the filter.
     * @param {Any} value - The value to compare against.
     * @return {Object} The current instance after filtering.
     */
    where({ column: col, operator: op, value: val }) {
        this.query = { col, op, val }
        this.filterResults()
        return this
    }

    /**
     * Filters the results based on the queries specified.
     *
     * @return {Array} The filtered results.
     */
    filterResults() {
        const { col, op, val } = this.query
        this.results = this.results.filter((row) => {
            switch (op) {
                case "=":
                    return row[col] === val
                case "!=":
                    return row[col] !== val
                case ">":
                    return row[col] > val
                case "<":
                    return row[col] < val
                case ">=":
                    return row[col] >= val
                case "<=":
                    return row[col] <= val
                case "like":
                    return row[col].includes(val)
                case "not like":
                    return !row[col].includes(val)
                default:
                    break
            }
        })
    }

    /**
     * Returns an iterator that yields each row of the `results` array.
     *
     * @return {IterableIterator<any>} An iterator that yields each row of the `results` array.
     */
    *get() {
        for (const row of this.results) yield { ...row, delete: () => this.delete(row) }
    }

    /**
     * Returns the first element from the 'results' array.
     *
     * @return {Any} The first element from the 'results' array.
     */
    first() {
        return this.results.shift()
    }

    /**
     * Sets the values of the Sheets instance by fetching data from the selected table.
     *
     * @return {Object} The Sheets instance with updated values.
     */
    async setValues() {
        const { data } = await this.client.spreadsheets.values.get({
            spreadsheetId: this.id,
            range: this.selectedTable,
        })
        const header = data.values.shift()
        const entries = data.values.map((row, index) => {
            const obj = header.reduce((obj, key, i) => {
                this.header.push(key)
                key = key
                    .replace(/[^a-zA-Z0-9]/g, " ")
                    .replace(/\s+/g, "_")
                    .toLowerCase()
                obj[key] = row[i].trim()
                return obj
            }, {})
            return { ...obj, primary_key: index + 1 }
        })
        this.values = { [this.selectedTable]: entries }
        this.results = entries
        this.header.pop()
        return this
    }

    /**
     * Retrieves the titles of all sheets in the spreadsheet and sets the `tables` property
     * of the current instance.
     *
     * @return {Promise<this>} A Promise that resolves to the current instance.
     */
    async setTables() {
        const { data } = await this.client.spreadsheets.get({
            spreadsheetId: this.id,
            fields: "sheets.properties.title",
        })
        this.tables = data.sheets.map((sheet) => sheet.properties.title)
        return this
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
     * @param {string} options.direction - The direction of the sort. Can be either "asc" or "desc".
     * @return {Object} - The current instance with the sorted `results` array.
     */
    orderBy({ column: col, direction: dir }) {
        this.results = this.results.sort((a, b) => {
            if (a[col] < b[col]) return -1
            if (a[col] > b[col]) return 1
            return 0
        })
        if (dir === "desc") this.results.reverse()
        return this
    }

    /**
     * Executes a callback function with the results as the argument and returns the current instance.
     *
     * @param {Function} callback - The function to be executed with the results as the argument.
     * @return {Object} The current instance.
     */
    orderByRaw(callback) {
        callback(this.results)
        return this
    }
    /**
     * Saves the results to the spreadsheet by updating the values of the selected table.
     *
     * This function iterates over the results array and updates the corresponding value in the values array
     * for the selected table. If a matching value is found, it merges the result object with the existing value.
     * The function then logs the updated value to the console. Finally, it calls the updateSheets function
     * to update the spreadsheet with the latest values.
     *
     * @return {Promise<void>} A promise that resolves when the save operation is complete.
     */
    async save() {
        this.results.forEach((result) => {
            const index = this.values[this.selectedTable].findIndex((value) => value.primary_key === result.primary_key)
            if (index !== -1) {
                this.values[this.selectedTable][index] = {
                    ...this.values[this.selectedTable][index],
                    ...result,
                }
            }
            console.log(this.values[this.selectedTable][index])
        })
        await this.updateSheets()
    }

    async delete(row) {
        console.log(row)
        const index = this.values[this.selectedTable].findIndex((value) => value.primary_key === row.primary_key)
        if (index !== -1) {
            this.values[this.selectedTable].splice(index, 1)
        }
        await this.updateSheets()
    }

    /**
     * Updates the sheets in the spreadsheet with the latest values.
     *
     * This function clears the values of the selected table and updates them with the latest values.
     * It only performs this operation in development mode. The function first retrieves the values
     * from the `values` array for the selected table and maps them to an array of values. The header
     * is then added to the beginning of the values array. The function then clears the values of
     * the selected table in the spreadsheet using the `clear` method of the `client.spreadsheets.values`
     * object. Finally, the function updates the values of the selected table using the `batchUpdate`
     * method of the `client.spreadsheets.values` object.
     *
     * @return {Promise<void>} A promise that resolves when the sheets have been updated.
     */
    async updateSheets() {
        const values = this.values[this.selectedTable].map((value) => Object.values(value))
        values.unshift(this.header)
        await this.client.spreadsheets.values.clear({
            spreadsheetId: this.id,
            range: this.selectedTable,
        })
        await this.client.spreadsheets.values.batchUpdate({
            spreadsheetId: this.id,
            requestBody: {
                data: [
                    {
                        range: this.selectedTable,
                        values: values,
                    },
                ],
                valueInputOption: "RAW",
            },
        })
    }
}

module.exports = Sheets
