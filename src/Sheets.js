const { google } = require("googleapis")
const { JWT } = require("google-auth-library")
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

Sheets.prototype.auth = function () {
    const auth = new JWT(this.account.client_email, null, this.account.private_key, this.api)
    this.client = google.sheets({ version: "v4", auth })
}

module.exports = Sheets
