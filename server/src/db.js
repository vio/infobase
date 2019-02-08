import mongoose, { mongo } from "mongoose";

/* eslint-disable no-console */

function get_connection_str(){

  if(global.IS_DEV_SERVER){
    console.log("using local db")
    return "mongodb://127.0.0.1:27017/infobase";
  }

  console.log("using remote db")
  const {
    MDB_NAME, //using different databases on the same 'cluster' will be how we stage deployments 
    MDB_USERNAME, // different usernames in read-mode vs populate-mode
    MDB_PW,
  } = process.env;

  //TODO: make database location (host) completely secret from repo
  //tried short connection string, but it didn't work in the lambda for some reason
  return `mongodb://${MDB_USERNAME}:${MDB_PW}@ib-dev-free-shard-00-00-vf7l5.gcp.mongodb.net:27017,ib-dev-free-shard-00-01-vf7l5.gcp.mongodb.net:27017,ib-dev-free-shard-00-02-vf7l5.gcp.mongodb.net:27017/${MDB_NAME}?ssl=true&replicaSet=ib-dev-free-shard-0&authSource=admin&retryWrites=true`;
}


// Connect to MongoDB with Mongoose.
export async function connect_db(){
  return await mongoose.connect(
    get_connection_str(),
    { 
      useCreateIndex: true,
      useNewUrlParser: true,
    }
  )
    .then( () => console.log("MongoDB connected") )
    .catch(err => {
      console.log(err);
    });
}

//make sure this is called after connect_db()
export async function drop_db(){
  return await mongoose.connection.db.dropDatabase();
}