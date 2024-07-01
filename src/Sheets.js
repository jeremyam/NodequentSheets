const { google } = require("googleapis")
const { JWT } = require("google-auth-library")
const sleep = require("./functions").sleep

class Sheets {
    constructor({ developmentId: devId, productionId: prodId, serviceAccount: account }) {
        this.devId = devId
        this.prodId = prodId
        this.account = account
        this.id = ""
        this.api = ["https://www.googleapis.com/auth/spreadsheets"]
        this.client = ""
        this.values = []
        this.selectedTable = ""
        this.query = ""
        this.results = []
        this.mode = "Production"
    }

    /**
     * Sets the mode of the object based on the provided parameter.
     *
     * @param {Object} options - An object containing the following properties:
     * @param {boolean} [development=false] - A boolean indicating whether the mode should be set to development or production.
     * @return {Promise<void>} - A promise that resolves when the mode has been set.
     */
    async setMode({ development = false } = { development: false }) {
        this.id = development ? this.devId : this.prodId
        this.mode = development ? "Development" : "Production"
    }

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
        const auth = new JWT(this.account.client_email, null, this.account.private_key, this.api)
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
     * Returns the results stored in the instance variable 'results'.
     *
     * @return {Array} The results stored in the instance variable 'results'.
     */
    get() {
        return this.results
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
        this.values = []
        const { data } = await this.client.spreadsheets.values.get({
            spreadsheetId: this.id,
            range: this.selectedTable,
        })
        const header = data.values.shift()
        const entries = {}
        entries[this.selectedTable] = data.values.map((row) => {
            return header.reduce((obj, key, index) => {
                obj[key] = row[index]
                return obj
            }, {})
        })
        this.values = entries
        this.results = entries[this.selectedTable]
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

    orderBy({ column: col, direction: dir }) {
        this.results = this.results.sort((a, b) => {
            if (a[col] < b[col]) return -1
            if (a[col] > b[col]) return 1
            return 0
        })
        if (dir === "desc") this.results.reverse()
        return this
    }

    orderByRaw(callback) {
        callback(this.results)
        return this
    }

    save() {}
}

module.exports = Sheets
