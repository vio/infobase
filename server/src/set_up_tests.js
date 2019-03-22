const { graphql } = require("graphql");

const { connect_db, drop_db } = require("./db.js");

const {
  create_models,
  populate_models,
  create_schema,
} = require('./models/index.js');


global.USE_TEST_DATA = true;
global.IS_DEV_SERVER = true;

(async ()=> {
  await connect_db();
  await drop_db();
  create_models();
  await populate_models();
  console.log("done"); /* eslint-disable-line no-console */
})();

const schema = create_schema();
global.execQuery = async function(query, vars={}){
  if(!vars.lang){
    vars = { lang: "en", ...vars };
  }
  const result = await graphql(schema, query, null, {} ,vars);
  return result;
};