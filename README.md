# nodequentsheets

This is a package that turns google sheets into a quasi node.js ORM. It uses the `google-api-nodejs-client` to authenticate with the google sheets API. It currently implements the Google service account for authentication, but future releases might incorporate other authentications. 

At this point, you can pull data form a sheet, manipulate that data, then write it back. The downside to this format is that it primarily works through batch updating. Even if one row is manipulated, this package will clear the sheet, then readd all the rows. It assumes that there is a header row. 

In order to better facilitate testing, nodequentsheets allows you to put the sheet ID of a `production` and a `developement` sheet and it gives you the option to set the mode to either development or production. In order to do this, you need to set .env (currently in the root of the package).

To use this package, you need to have a google service account and a google sheets document. You need to have the service account's credentials stored in a file named `credentials.json` in a directory named `storage`.

You can install this package using npm, `npm i nodequentsheets`
