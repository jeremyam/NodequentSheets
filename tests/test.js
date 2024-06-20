require("dotenv").config()
const Sheets = require("../src/Sheets")

const db = new Sheets({
    developmentId: process.env.DEV_ID,
    productionId: process.env.PROD_ID,
    serviceAccount: require("../storage/credentials.json"),
})

db.setMode({ development: true })
const start = async () => {
    await db.init()
    const Genesis = await db.table("Genesis")
    console.log(Genesis.get())
}

start()
