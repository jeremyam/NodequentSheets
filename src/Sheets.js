const { google } = require("googleapis")
const { JWT } = require("google-auth-library")
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
/**
 * Creates a new instance of the Sheets class.
 *
 * @param {Object} options - The options for creating the Sheets instance.
 * @param {string} options.developmentId - The development ID.
 * @param {string} options.productionId - The production ID.
 * @param {Object} options.serviceAccount - The service account credentials.
 * @return {Sheets} The newly created Sheets instance.
 */
function Sheets({ developmentId: devId, productionId: prodId, serviceAccount: account }) {
    this.devId = devId
    this.prodId = prodId
    // Service Account Credentials.
    this.account = account
    this.id = ""
    this.api = ["https://www.googleapis.com/auth/spreadsheets"]
    this.client = ""
    this.values = []
}

/**
 * Sets the mode of the Sheets instance.
 *
 * @param {Object} options - The options for setting the mode.
 * @param {boolean} options.development - Whether the mode is development.
 * @return {void}
 */
Sheets.prototype.setMode = function ({ development = false } = { development: false }) {
    this.id = development ? this.prodId : this.devId
}

Sheets.prototype.init = async function () {
    const auth = new JWT(this.account.client_email, null, this.account.private_key, this.api)
    this.client = google.sheets({ version: "v4", auth })
    await this.setTables()
}

Sheets.prototype.setValues = async function (table) {
    this.values = []
    const { data } = await this.client.spreadsheets.values.get({
        spreadsheetId: this.id,
        range: table,
    })
    const header = data.values.shift()
    const entry = {}
    entry[table] = data.values.map((row) => {
        return header.reduce((obj, key, index) => {
            obj[key] = row[index]
            return obj
        }, {})
    })
    this.values.push(entry)
}

Sheets.prototype.setTables = async function () {
    const { data } = await this.client.spreadsheets.get({
        spreadsheetId: this.id,
        fields: "sheets.properties.title",
    })
    this.tables = data.sheets.map((sheet) => sheet.properties.title)
}

Sheets.prototype.getTables = function () {
    return this.tables
}

module.exports = Sheets
