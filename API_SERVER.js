/*
GET /companies/3/employees should get the list of all employees from company 3
GET /companies/3/empmloyees/45 should get the details of employee 45, which belongs to company 3
DELETE /companies/3/employees/45 should delete employee 45, which belongs to company 3
POST /companies should create a new company and return the details of the new company created

Isn’t the APIs are now more precise and consistent?
*/

console.log("*******START OF API EXECUTION *******");

// Read in configurable properties

var properties_reader = require('properties-reader');
var conn_properties = properties_reader('conn_creds.ini');
/*
// fully qualified name
var property = properties.get('some.property.name');

*/

////////////////   CONNECTION INFORMATION ////////////////////////////
function createSSHCredentials(conn_props){
    var ssh = new Object()
    ssh.host = conn_props.get("ssh.host");                                  
    ssh.user = conn_props.get("ssh.user");                                  
    ssh.password = conn_props.get("ssh.password");                                                          //'Dan123!';
    return ssh;
}

function createMySQLCredentials(conn_props){
    var server_mode = conn_properties.get("general.server_mode");

    var msc = new Object();
    msc.host = conn_props.get("sql_" + server_mode + ".host");                                                               //'127.0.0.1';
    msc.port = conn_props.get("sql_" + server_mode + ".port");
    msc.user = conn_props.get("sql_" + server_mode + ".user");
    msc.password = conn_props.get("sql_" + server_mode + ".password");
    msc.database = conn_props.get("sql_" + server_mode + ".database");
    return msc
}

isSSH = (conn_properties.get("general.is_ssh") == "TRUE");


var express = require('express'), // npm install express

app      =  express();

const { Pool } = require('pg');

var f     = require('./sensor_table_functions');

//var connected_client=null;
f.connected_client = null;


var confg = require('./config')
confg.childParentMap();


// variables for api calls
var mroute="";
var tablename="";
var parent="";
var lookup="";
var orderBy="";
var orderByClause="";
var filter="";
var counter = 0;

//var mssh = require('mysql-ssh');
var mssh = require('mysql');


process.on('uncaughtException', function (err) {
    //mssh.close();
    console.error("**** uncaughtException triggered: ******")
    console.error("error=",err);
    var needsReconnect = err.fatal;
    console.error("needsReconnect=",needsReconnect)
    if(needsReconnect){
        console.error("OPEN CONNECTION NEEDED?")
        //mssh._conn = null;
        //mssh._sql = null;
        f.connected_client = null;
    }
});


///////////////////////////////////////////////////////////////////////

function fillAPIVars(req){
    mroute = req.originalUrl;
    if (mroute.split("_").length > 1){
        tablename = ""+ mroute.split("_")[1];
        lookup = tablename.substring(0,tablename.length-1)
    }

    parent = confg.childParentMap()[tablename];
    orderBy = req.query.orderby;                                      //req.param("orderby");
    filter = req.query.filter==null ? "" : req.query.filter;         //req.param("filter")==null ? "" : req.param("filter");
    
    orderByClause = req.query.orderby==null ? "" : "ORDER BY " + orderBy + " ";  //req.param("orderby")==null ? "" : "ORDER BY " + orderBy + " ";
}

function do_main(client,req,res,mode){

                //make sure client is connected


                if (mode.toUpperCase() == "GET"){
                    
                        if (mroute.indexOf("by_id") >= 0){
                            //console.log("YOUR PARAMS = " + lookup + "id" + ":" + req.param("id"));
                            f.getRecordsByID(req.query.id, tablename,lookup, orderByClause, client, filter, req,res,mssh);
                        }else{
                            //console.log("YOUR PARAMS = " +parent+"id:" + req.param(parent + "id"));
                            f.getRecordsByID(req.param(parent + "id"), tablename, parent, 
                                                                       orderByClause,client, filter, req,res,mssh);
                        }
                }

                if (mode.toUpperCase() == "GETLAST"){
                        //console.log("IN GETLAST");
                        var lookupTableName = tablename.substring(0,tablename.length-1);
                        f.getRecordsByID("ALL",tablename,lookupTableName,
                                 " ORDER BY "+ lookupTableName + "ID" + " DESC LIMIT 1",client,"",req,res,mssh)
                }

                if (mode.toUpperCase() == "GETLASTOFBATCH"){
                        console.log("EXECUTING GET LAST OF BATCH QUERY");
                        tablename="hardwareids";
                        var lookupTableName = "hardwareid";
                        var mfdate = req.query.mfdate;
                        //console.log("mfdate=",mfdate)
                        var deviceType = req.query.devicetype;
                        //console.log("deviceType=",deviceType)
                        var mfilter = "";
                        if (mfdate != null && deviceType != null){
                            mfilter = " mfdate=" + mfdate + " AND devicetype=" + deviceType;
                        }

                        
                        console.log("MFILTER=",mfilter)

                        f.getRecordsByID("ALL",tablename,lookupTableName,
                                 " ORDER BY "+ lookupTableName + "ID" + " DESC LIMIT 1",client,mfilter,req,res,mssh); 
                }

                if (mode.toUpperCase() == "GETLASTHARDWAREID"){
                        console.log("IN GETLASTHARDWAREID");
                        var modex =  tablename;
                        tablename="hardwareids";
                        var lookupTableName = "hardwareid";
                        var mfilter = " devicetype" + (modex=="M"? ">=" : "<") + "3000"
                        f.getRecordsByID("ALL",tablename,lookupTableName,
                                 " ORDER BY "+ lookupTableName + "ID" + " DESC LIMIT 1",client,mfilter,req,res,mssh); 
                }

                if (mode.toUpperCase() == "GETINVENTORYOVERTIME"){
                        console.log("IN GETINVENTORYOVERTIME");
                        f.getInventoryOverTime(client, req,res,mssh);
                }


                if (mode.toUpperCase() == "VIEW"){
                     f.getRecordsByView(tablename,client,req,res,mssh);
                }

                if (mode.toUpperCase() == "INSERT"){
                    tablename = req.QUERY.tablename;
                    //console.log("tablename=",tablename);
                    f.insertRecords(tablename,client, req,res,mssh);
                }

                if (mode.toUpperCase() == "MULTIINSERT"){
                    tablename = req.query.tablename;
                    //console.log("tablename=",tablename);
                    f.multiInsertRecords(tablename,client, req,res,mssh);
                }

                if (mode.toUpperCase() == "UPDATE"){
                    tablename = req.query.tablename;
                    //let id = req.param("id")
                    //console.log("tablename=",tablename);
                    f.updateRecords(tablename, client, req, res,mssh);
                }

                if (mode.toUpperCase() == "ACTIVATE"){
                    //let id = req.param("id")
                    tablename = tablename.split("?")[0];
                    console.log("tablename=",tablename)
                    f.updateRecords(tablename, client, req, res,mssh);
                }

                if (mode.toUpperCase() == "EXECUTESQL"){
                     f.runSQL(client, req, res,mssh);
                }


                //table specific API endpoints

                if (mode.toUpperCase() == "INSERTFACINGS"){
                     f.insertFacings(client, req, res,mssh);
                }


                if (mode.toUpperCase() == "GETMAXFACINGPOSITIONBYSHELF"){
                    f.getMaxFacingPosByShelf(client, req, res, mssh);
                }

                if (mode.toUpperCase() == "GETMAXSHELFLEVELBYFIXTURE"){
                    f.getMaxShelfLevelByFixture(client, req, res, mssh);
                }

                if (mode.toUpperCase() == "UPDATEFACINGMERCHDATA"){
                     f.updateFacingMerchandiseData(client, req, res,mssh);
                }



}

function connectAndExecute(req,res,mode){
    
    try{

        //second underline is tablename
        fillAPIVars(req);
        
        //var connected = mssh._conn!=null;
        //var sqlConnected = mssh._sql!=null;
 
        console.error("**** CONNNECTION OBJECT STATE ******");
        console.log("connected=",f.connected_client!=null);
        console.log("*********************************");
        /*
        Object.keys(mssh).forEach(key => {
           let value = mssh[key];
           console.error("mssh.",key,"=",value);
           /////////////////
        });
        */
       // if (true || (connected && sqlConnected)){
        if (f.connected_client!=null){
            do_main(f.connected_client,req,res,mode);
        }else{
            try{

                if (isSSH){
                   mssh  =  require('mysql-ssh');
                   console.log("SSH Authentication");

                   mssh.connect(f.createSSHCredentials(conn_properties),
                                f.createMySQLCredentials(conn_properties)).
                   then(client => {
                                   /////////////
                                   client.query('SELECT * FROM `stores`', function (err, results, fields) {
                                            if (err){
                                                throw err
                                            } 
                                          
                                    })
                                            /////////////
                                            
                                    f.connected_client = client;

                                    do_main(f.connected_client,req,res,mode);
                                   }
                       );
   
                   ////////////////
                }else{

                     mssh  =  require('mysql-ssh');
                     f.connected_client = 
                        mssh.createConnection(f.createMySQLCredentials(conn_properties));

                     Object.keys(f.connected_client).forEach(key => {
                           let value = f.connected_client[key];
                           console.error("f.connected_client.",key,"=",value);
                     });
                     console.log("createdconnection");
                     do_main(f.connected_client,req,res,mode);
            }
            }catch(e){
                console.log("Error doing ",mode)
                console.log(e);
                //mssh._sql = null;
                //mssh._conn = null;
                f.connected_client = null;
            }

        }
        
    }catch(e){
        console.log("error=",e);
        //mssh = require('mysql-ssh');
    }
}

console.log("initiating connection");

/////////////
// allow cross domain access to API
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  console.log("Allow x-domain requests -- ON");

  next();
 });
////////////

app.get('/dbCannedview*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"VIEW");
});

app.get('/dbGet_*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    console.log(counter++);
    connectAndExecute(req,res,"GET");
});

app.get('/dbGetlast_*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETLAST");
});


app.get('/dbInsertFacings*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"INSERTFACINGS")
});

app.get('/dbUpdateFacingMerchandiseData*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"UPDATEFACINGMERCHDATA")
});

app.get('/dbGetMaxFacingPositionByShelf*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETMAXFACINGPOSITIONBYSHELF")
});

app.get('/dbGetMaxShelfLevelByFixture*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETMAXSHELFLEVELBYFIXTURE")
});

app.get('/dbGetSensorOverTimeData*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETSENSORDATAOVERTIME")
});

app.get('/dbGetInventoryOverTime', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETINVENTORYOVERTIME")
});


app.get('/dbInsert*', function(req, res) {
    connectAndExecute(req,res,"INSERT")
});

app.get('/dbMultiInsert*', function(req, res) {
    connectAndExecute(req,res,"MULTIINSERT")
});

app.get('/dbUpdate*', function(req, res) {
    connectAndExecute(req,res,"UPDATE")
});

app.get('/opActivate*', function(req, res) {
    //same as update except tablename is implied in URL, not as a parameter
    connectAndExecute(req,res,"ACTIVATE")
});

// document these two in API documentation
app.get('/dbGetlastofbatch*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETLASTOFBATCH")
});

app.get('/dbGetlasthardwareid_*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    connectAndExecute(req,res,"GETLASTHARDWAREID")
});

app.get('/dbExecuteSQL*', function(req, res) {
    //tablename = ""+ mroute.split("_")[1];
    console.log("path=dbExecuteSQL");
    connectAndExecute(req,res,"EXECUTESQL");

});







////////////END OF non genenic API calls


// serve static files in /public
app.use(express.static('public'));
//app.timeout(240000);
// listen on port 8080
app.listen(8080, function() {
    console.log('***Server is listening on 8080...');

});





//APIs

// turn this into API
// SELECT * FROM (SELECT EMP.*,ROWNUM FROM EMP ORDER BY ROWNUM DESC) WHERE ROWNUM=1;


//dbGet_<<tablename>>by_id?id=<<value>>                                   //get records from table with primary key
//
// example:
//

//dbGet_<<tablename>>by_<<parentobject>>ID?<<parentobject>>ID=<<value>>   //get records from table with foreign key/other
//
//


//dbInsert?tablename=<<tablename>>&fields={<<fieldname>>:<<value>>,..,<<fieldname>>:<<value>>} //insert record into table using fields object to map
//
// example:
//
//dbInsert?tablename=displayfixtures&fields={"storeID":1,"level":1,"displayfixtureIDForUser":"testertest","type":"gondola","location":"Detroit"}


//dbUpdate?tablename=<<tablename>>&id=<<pkey>>&fields={<<fieldname>>:<<value>>,..,<<fieldname>>:<<value>>} ///update record in table using fields object to map
//
// example:
//
//dbUpdate?tablename=facings&fields={"activationDate":"2018-12-31","RS485Address":"6E","backBrightness":0,"numberOfSensors":8,"geolocation":"","mfdate":"2018-10-03","SN":"000323331"}&id=5



////////////non generic/////////////////////



//
//dbGetMaxFacingPositionByShelf?shelfID=<<shelfID>>
//
// example:
//
//dbGetMaxFacingPositionByShelf?shelfID=28;

//
//dbGetMaxShelfLevelByFixture?fixtureID=<<fixtureID>>
//
// example:
//
//dbGetMaxShelfLevelByFixture?fixtureid=24;



//dbInsertFacings?facing={<<fieldname>>:<<value>>,..,<<fieldname>>:<<value>>}&numberoffacings=<<n>>
//
// example:
//
//dbInsertFacings?facing={"shelfID":5,"shelfRelativeAddress","depth":48,"width":12,"height":12,"activationDate":"2018-12-31"}&numberoffacings=5

   
//dbUpdateFacingMerchandiseData?shelfid=1&startposition=5&endposition=10&merchandiseitemid=6&fromdate=2019-12-29-10:22:00;  
//
// example:
//
//dbUpdateFacingMerchandiseData?shelfid=1&startposition=5&endposition=10&merchandiseitemid=6&fromdate=2019-12-29-10:22:00;  


// opActivate_facing?id=2&fields={"activationDate":"2018-12-31","RS485Address":"6E","backBrightness":0,"numberOfSensors":8,"geolocation":"",
// "mfdate":"2018-10-03","SN":"000323331"}


// example of dbExecuteSQL API:

//dbExecuteSQL?sqlstatement=select * from facings;



//http://localhost:8080/dbGetInventoryOverTime?startdate=<<startdate>>&enddate=<<enddate>>&inthrs=<<inthrs>>&intmins=<<intmins>>&returnintervalsonly=<<true/false>>&searchterms=<<searchterms>>

// example:

//http://localhost:8080/dbGetInventoryOverTime?startdate=2020-02-23T14:30:00&enddate=2020-02-23T22:30:00&inthrs=1&intmins=15&returnintervalsonly=false&searchterms={%22storeID%22:[1,2],%22clientID%22:[1,2]}
    
/// *** for time intervals only
//http://localhost:8080/dbGetInventoryOverTime?startdate=2020-02-23T14:30:00&enddate=2020-02-23T22:30:00&inthrs=1&intmins=15&returnintervalsonly=true

