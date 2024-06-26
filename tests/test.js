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
    const Genesis = (await db.table("Genesis"))
        .where({
            column: "NT Parallel Books",
            operator: "=",
            value: "John",
        })
        .where({
            column: "NT Verse",
            operator: "=",
            value: "1:1–3",
        })
        .get()
    console.log(Genesis)
}

start()
