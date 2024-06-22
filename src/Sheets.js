const { google } = require("googleapis")
const { JWT } = require("google-auth-library")
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
    }

    async setMode({ development = false } = { development: false }) {
        this.id = development ? this.prodId : this.devId
    }

    async init() {
        const auth = new JWT(this.account.client_email, null, this.account.private_key, this.api)
        this.client = google.sheets({ version: "v4", auth })
        await this.setTables()
        return this
    }

    async table(table) {
        this.selectedTable = table
        await this.setValues()
        return this
    }

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

    get() {
        return this.results
    }

    first() {
        return this.results.pop()
    }

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

    async setTables() {
        const { data } = await this.client.spreadsheets.get({
            spreadsheetId: this.id,
            fields: "sheets.properties.title",
        })
        this.tables = data.sheets.map((sheet) => sheet.properties.title)
        return this
    }

    getTables() {
        return this.tables
    }
}

module.exports = Sheets