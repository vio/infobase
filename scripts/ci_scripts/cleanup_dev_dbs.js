const active_db_names = active_branches.replace(/origin\//g, "").split(" ");

print(active_branches);

print(active_db_names);

const all_dev_db_names = db.adminCommand( { listDatabases: 1, nameOnly: true} ).databases;

for (i=0; i < all_dev_db_names.length; i++){
  const db_name = all_dev_db_names[i].name;
  if ( !active_db_names.includes(db_name) ){
    print(db_name);
    //db.getSiblingDB(db_name).dropDatabase();
  }
}