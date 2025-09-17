
const { graphQlQueryToJson } = require("graphql-query-to-json");

const { config } = global.VexaBot;
const databaseType = config.database.type;

function fakeGraphql(query, data, obj = {}) {
	if (typeof query != "string" && typeof query != "object")
		throw new Error(`The "query" argument must be of type string or object, got ${typeof query}`);
	if (query == "{}" || !data)
		return data;
	if (typeof query == "string")
		query = graphQlQueryToJson(query).query;
	const keys = query ? Object.keys(query) : [];
	for (const key of keys) {
		if (typeof query[key] === 'object') {
			if (!Array.isArray(data[key]))
				obj[key] = data.hasOwnProperty(key) ? fakeGraphql(query[key], data[key] || {}, obj[key]) : null;
			else
				obj[key] = data.hasOwnProperty(key) ? data[key].map(item => fakeGraphql(query[key], item, {})) : null;
		}
		else
			obj[key] = data.hasOwnProperty(key) ? data[key] : null;
	}
	return obj;
}

module.exports = async function (api) {
	var threadModel, userModel, dashBoardModel;
	switch (databaseType) {
		case "mongodb": {
			
			const defaultClearLine = process.stderr.clearLine;
			process.stderr.clearLine = function () { };
      log.info('MONGODB', global.getText('MD_try'));
			try {
				var { threadModel, userModel, globalModel } = await require("../connectDB/connectMongoDB.js")(config.database.uriMongodb);
				process.stderr.clearLine = defaultClearLine;
        
         log.info('MONGODB', global.getText('MD_Done'));
		
			}
			catch (err) {
				process.stderr.clearLine = defaultClearLine;
			
         log.err('MONGODB', global.getText('MD_Error'), err.stack);
		
				process.exit();
			}
			break;
		}
		case "sqlite": {

      log.info('SQLITE', global.getText('MD_try'));
      
			const defaultClearLine = process.stderr.clearLine;
			process.stderr.clearLine = function () { };
       
			try {
				var { threadModel, userModel, globalModel } = await require("../connectDB/connectSqlite.js")();
				process.stderr.clearLine = defaultClearLine;
         
         log.info('SQLITE', global.getText('SQ_Done'));
		
			}
			catch (err) {
				process.stderr.clearLine = defaultClearLine;
        
				log.err('SQLITE', global.getText('SQ_Error'), err.stack);
		
				process.exit();
			}
			break;
		}
		default:
			break;
	}

	const threadsData = await require("./threadsData.js")(databaseType, threadModel, api, fakeGraphql);
	const usersData = await require("./usersData.js")(databaseType, userModel, api, fakeGraphql);
  const globalData = await require("./globalData.js")(databaseType, globalModel, fakeGraphql);
	

	global.db = {
		...global.db,
		threadModel,
		userModel,
    globalModel,
		threadsData,
		usersData,
    globalData
			};

	return {
		threadModel,
		userModel,
    globalModel,
		threadsData,
		usersData,
    globalData,
		databaseType
	};
};