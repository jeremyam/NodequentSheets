require("dotenv").config()
const Sheets = require("../src/Sheets")
const sleep = require("../src/functions").sleep

const db = new Sheets({
    developmentId: process.env.DEV_ID,
    productionId: process.env.PROD_ID,
    serviceAccount: require("../storage/credentials.json"),
})

db.setMode({ development: true })
console.log(db.getMode())
const start = async () => {
    await db.init()
    const Genesis = (await db.table("Genesis"))
        .where({
            column: "NT Parallel Books",
            operator: "=",
            value: "John",
        })
        /* .where({
            column: "NT Verse",
            operator: "=",
            value: "1:1–3",
        }) */
        //.orderBy({ column: "OT Verse", direction: "desc" })
        .orderByRaw((data) => {
            return data.sort((a, b) => {
                const valueA = parseInt(a[1], 10)
                const valueB = parseInt(b[1], 10)

                if (valueA !== valueB) {
                    return valueA - valueB
                } else {
                    let partsA, partsB
                    try {
                        a[2] = `${a[2]}`
                        partsA = a[2].split(":")
                    } catch (error) {
                        console.log(`${a[2]} does not have a .split function`)
                    }
                    try {
                        b[2] = `${b[2]}`
                        partsB = b[2].split(":")
                    } catch (error) {
                        console.log(`${b[2]} does not have a .split function`)
                    }

                    const leftSideA = parseInt(partsA[0], 10)
                    const rightSideA = parseInt(partsA[1], 10)
                    const leftSideB = parseInt(partsB[0], 10)
                    const rightSideB = parseInt(partsB[1], 10)

                    if (leftSideA !== leftSideB) {
                        return leftSideA - leftSideB
                    } else {
                        return rightSideA - rightSideB
                    }
                }
            })
        })
        .get()
        //console.log(Genesis)
   
}

start()
