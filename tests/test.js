const Sheets = require("../src/Sheets")
const db = new Sheets({
    developmentId: "DevID",
    productionId: "ProdID",
    serviceAccount: require("../storage/credentials.json"),
})

db.setMode({ development: true })

console.log(db)
