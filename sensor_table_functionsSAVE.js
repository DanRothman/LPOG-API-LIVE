module.exports = {

  runSQL:function (client,req,res,mssh){
      
      try{
          sqlstatement = req.param("sqlstatement")==null ? "" : req.param("sqlstatement");
          //if (sqlstatement.substring(0,6).toUpperCase()=="SELECT"){
             executeQuery(sqlstatement,client,res,mssh);
          //}
        }catch(e){
          console.log("illegal request : " + sqlstatement," in runSQL");
        } 
  },

  getRecordsByID: function (id, tablename, lookupTableName, orderByClause, client, filter, req,res,mssh) {
        var whereClause = "";
 
        if (id != null && id.toUpperCase() != "ALL"){
            whereClause = " WHERE " + lookupTableName + "ID=" + id 
        }

        if (filter != ""){
           if (whereClause != ""){
             whereClause += " AND " + filter;
           }else{
             whereClause = "WHERE " + filter;
           }
        }

        var q = "SELECT * FROM " + tablename + " " + whereClause + " " + orderByClause + ";";
        try{
          //for(i=0;i<15;i++)
        	executeQuery(q,client,res,mssh);
      	}catch(e){
           console.log("Error running sql = ",q), " in getRecordsByID";
      	}	
  },
  getRecordsByView:function(tablename,client,req,res,mssh){
      var q = "SELECT * FROM " + tablename + ";"
      try{
          executeQuery(q,client,res,mssh);
      }catch(e){
        console.log("Error running sql = ",q, " in getRecordsByView");
      } 
  },
  insertRecords: function (tablename,client, req,res) {
  	// var sql = "INSERT INTO customers (name, address) VALUES ('Company Inc', 'Highway 37')";
  	//console.log("YOUR PARAMS = " +parent+"id:" + req.param(parent + "id"));
  	
  	try{
        //fields is a stringified JSONObject
        //var fieldsAndValues = req.param("fields")

         var fieldsAndValues = req.param("fields")
         console.log("In executeInsert1")
         console.log("fieldsAndValues=",fieldsAndValues)
         var fvMap = JSON.parse(fieldsAndValues)
         var q = 'INSERT INTO '+ tablename +' SET ?'
         client.query(q, fvMap, (qerr, qres) => {
            if(qerr) {
              console.log("THERE WAS AN ERROR IN EXECUTEINSERT")
              console.log("error = ", qerr)
              console.log("this is only a printout, the server is still running")
              res.send([{code:"error"}]);
              return
              //throw qerr;
            }
            console.log("query=",q)
            console.log("Insert successfull!!")
            res.send([{code:"done"}]);
          });
          console.log("Exiting executeInsert")
    }catch(e){
      console.log("Error running sql = ",q," in insertRecords");
    }	                
  },
  multiInsertRecords: function (tablename,client, req,res) {
    var fvMap = JSON.parse(req.param("fields")).recs 
    console.log("fvMap=",fvMap)
    if (fvMap.length <= 0){
      res.send([{code:'error'}])
      return
    } 

    var field_list = "(";
    var field_list_Array = []
    var field_values = "";

    //build field_list, and field_list_array -- field_list_array facilitates getting data from json array
    for (var p in fvMap[0]) {
      field_list+=("`"+p+"`,");
      field_list_Array.push(p)
    }
    field_list = field_list.substring(0,field_list.length-1)+")"
    for (var i=0; i < fvMap.length;i++){
      field_values+="("
      for (f in field_list_Array){
        var val = fvMap[i][field_list_Array[f]]
        var valOut = val + ""
        valOut = "'"+valOut+"'"
       
        field_values += (valOut + ",")
      }
      field_values = field_values.substring(0,field_values.length-1)+"),"
    }
    field_values = field_values.substring(0,field_values.length-1)

    var q = 'INSERT INTO '+ tablename + " " + field_list + ' VALUES ' + field_values

    console.log("q=",q)


    try{
        client.query(q)
        console.log("Exiting MultiInsert")
    }catch(e){
console.log("Error running sql = ",q," in multiInsertRecords");
    }


    /*
    String jString = "{\"a\": 1, \"b\": \"str\"}";
JSONObject jObj = new JSONObject(jString);
Object aObj = jObj.get("a");
if(aObj instanceof Integer){
    System.out.println(aObj);
}
    */

    /*

    INSERT INTO `sungalg6db`.`devicetypes`
    (
      `deviceTypeID`,
      `dimension`,
      `LED`,
      `numberOfSensors`
    )
    VALUES
    (1,3.0,TRUE, 8),
    (2,3.0,FALSE,8),
    */


    //console.log("fvMap=",fvMap)
    res.send([{code:'done'}]);
  },
    //////// FOR UPDATES //////////////
    updateRecords:function(tablename,client,req,res){
         var tLookup = tablename.substring(0,tablename.length-1);
         var fieldsAndValues = req.param("fields");
         var id = req.param("id");
         console.log("In executeupdate1");
         console.log("fieldsAndValues=",fieldsAndValues);
         var fvMap = JSON.parse(fieldsAndValues);

         //UPDATE `members` SET `full_names` = 'Janet Smith Jones', `physical_address` = 'Melrose 123' WHERE `membership_number` = 2;

         //connection.query('UPDATE users SET ? WHERE UserID = :UserID',{UserID: userId, Name: name})
         var q = 'UPDATE '+ tablename +' SET ? WHERE ' + tLookup + 'ID = ' + id;

         client.query(q, fvMap, (qerr, qres) => {
            if(qerr) {
              console.log("THERE WAS AN ERROR IN EXECUTE UPDATE");
              console.log("EXECUTING ",q);
              console.log("error = ", qerr);
              console.log("this is only a printout, the server is still running");
              res.send([{code:'error'}]);
              return;
              //throw qerr;
            }
            console.log("query=",q);
            console.log("UPDATE successfull!!");
            res.send([{code:'done'}]);
          });
          console.log("Exiting executeUpdate");
    }
};

//helper functions


////////////FOR GETS /////////////////////////////
function executeQuery(sqlStatement,client,res, mssh){
  try{

      client.query(sqlStatement, (qerr, qres) => {

                    if (qerr) { 
                        console.log("!!!!! error occuring in executeQuery()")
                        console.log(qerr); 
                        res.send("[]");
                        //throw qerr; 
                    }
                    else {
                        // console.log("qres=",qres); 
                        res.send(qres);
                        //client.end();
                        console.log('query=',sqlStatement);
                    }
                    // comment this out!!!!
                    //client.close();
        });

  }catch(e){
      console.error("Error = ",e);
      console.error("There was an error when executing " + sqlStatement);
      console.error("Connection could have been closed");
  }    
}

