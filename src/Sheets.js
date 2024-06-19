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

module.exports = Sheets
