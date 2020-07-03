/*
GET /companies/3/employees should get the list of all employees from company 3
GET /companies/3/empmloyees/45 should get the details of employee 45, which belongs to company 3
DELETE /companies/3/employees/45 should delete employee 45, which belongs to company 3
POST /companies should create a new company and return the details of the new company created

Isn’t the APIs are now more precise and consistent?
*/

console.log("*******START OF API EXECUTE!!");

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
    var msc = new Object();
    msc.host = conn_props.get("sql.host");                                                               //'127.0.0.1';
    msc.port = conn_props.get("sql.port");
    msc.user = conn_props.get("sql.user");
    msc.password = conn_props.get("sql.password");
    msc.database = conn_props.get("sql.database");
    return msc
}



////////////////////////////////////////////////////////////////////

var connected_client;

var express = require('express'), // npm install express
app      =  express();

const { Pool } = require('pg');
//var mysql = require('mysql2');
var f     = require('./sensor_table_functions');
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
    var needsReconnect = false;
    Object.keys(err).forEach(key => {
        let value = err[key];
        console.error("err.",key,"=",value);
        if (key == "fatal" && value){
            needsReconnect = true;
        }
        
    });

    if(needsReconnect){
        console.error("We have to open a connection?")
        mssh._conn = null;
        mssh._sql = null;
    }
});

/*function createSSHCredentials(){
    var ssh = new Object()
    ssh.host = 'sungalsmartg.com'
    ssh.user = 'ax2gsfqq3895'
    ssh.password = 'Fanman1234!'
    return ssh
}

function createMySQLCredentials(){
    var msc = new Object()
    msc.host = '127.0.0.1'
    msc.port = 3306
    msc.user = 'ax2gsfqq3895'
    msc.password = 'Fanman1234!'
    msc.database = 'sungalg6db'
    return msc
} */

///////////////////////////////////////////////////////////////////////

function fillAPIVars(req){
    mroute = req.originalUrl;
    if (mroute.split("_").length > 1){
        tablename = ""+ mroute.split("_")[1];
        lookup = tablename.substring(0,tablename.length-1)
    }

    parent = confg.childParentMap()[tablename];
    orderBy = req.param("orderby");
    filter = req.param("filter")==null ? "" : req.param("filter");
    
    orderByClause = req.param("orderby")==null ? "" : "ORDER BY " + orderBy + " ";
}

function do_main(client,req,res,mode){
                if (mode.toUpperCase() == "GET"){
                    
                        if (mroute.indexOf("by_id") >= 0){
                            //console.log("YOUR PARAMS = " + lookup + "id" + ":" + req.param("id"));
                            f.getRecordsByID(req.param("id"), tablename,lookup, orderByClause, client, filter, req,res,mssh);
                        }else{
                            //console.log("YOUR PARAMS = " +parent+"id:" + req.param(parent + "id"));
                            f.getRecordsByID(req.param(parent + "id"), tablename, parent, 
                                                                       orderByClause,client, filter, req,res,mssh);
                        }
                }

                if (mode.toUpperCase() == "GETLAST"){
                        console.log("IN GETLAST");
                        var lookupTableName = tablename.substring(0,tablename.length-1);
                        f.getRecordsByID("ALL",tablename,lookupTableName,
                                 " ORDER BY "+ lookupTableName + "ID" + " DESC LIMIT 1",client,"",req,res,mssh)
                }

                if (mode.toUpperCase() == "GETLASTOFBATCH"){
                        console.log("IN GETLASTOFBATCH");
                        tablename="hardwareids";
                        var lookupTableName = "hardwareid";
                        var mfdate = req.param("mfdate");
                        console.log("mfdate=",mfdate)
                        var deviceType = req.param("devicetype");
                        console.log("deviceType=",deviceType)
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


                if (mode.toUpperCase() == "VIEW"){
                     f.getRecordsByView(tablename,client,req,res,mssh);
                }

                if (mode.toUpperCase() == "INSERT"){
                    tablename = req.param("tablename")
                    //console.log("tablename=",tablename);
                    f.insertRecords(tablename,client, req,res,mssh);
                }

                if (mode.toUpperCase() == "MULTIINSERT"){
                    tablename = req.param("tablename")
                    //console.log("tablename=",tablename);
                    f.multiInsertRecords(tablename,client, req,res,mssh);
                }

                if (mode.toUpperCase() == "UPDATE"){
                    tablename = req.param("tablename")
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

               // mssh.close();

}

function connectAndExecute(req,res,mode){
    
    try{

        //second underline is tablename
        fillAPIVars(req);
        
        var connected = mssh._conn!=null;
        var sqlConnected = mssh._sql!=null;
 
        console.error("**** CONNNECTION OBJECT STATE ******")
        console.log("connected=",connected);
        console.log("sqlConnected=",sqlConnected);
        console.log("*********************************");
        /////////////////
        Object.keys(mssh).forEach(key => {
           let value = mssh[key];
           console.error("mssh.",key,"=",value);
           /////////////////
        });
        ////////
        if (connected && sqlConnected){
            do_main(connected_client,req,res,mode);
        }else{
            //mssh.connect(createSSHCredentials(conn_properties),
            //             createMySQLCredentials(conn_properties))
            

            try{
                connected_client = 
                    mssh.createConnection(createMySQLCredentials(conn_properties));
                console.log("createdconnection");
                do_main(connected_client,req,res,mode);
            }catch(e){
                console.log("Error doing ",mode)
                console.log(e);
                mssh._sql = null;
                mssh._conn = null

            }

            /*

            .then(client=>{connected_client = client;
                           do_main(connected_client,req,res,mode);
                           })
            .catch(err => {
                console.log("Error doing ",mode)
                console.log(err);
                mssh._sql = null;
                mssh._conn = null;
             });*/

        }
        
    }catch(e){
        console.log("erro=",e);
        //mssh = require('mysql-ssh');
    }
}

console.log("initiating connection");

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

app.get('/dbInsert*', function(req, res) {
    connectAndExecute(req,res,"INSERT")
});

app.get('/dbMultiInsert*', function(req, res) {
    connectAndExecute(req,res,"MULTIINSERT")
});

app.get('/dbUpdate*', function(req, res) {
    connectAndExecute(req,res,"UPDATE")
});


////////////non genenic API calls

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

// listen on port 8080
app.listen(8080, function() {
    console.log('***Server listening...');
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


// opActivate_<<tablename>>?id=<<pkey>>&fields={<<fieldname>>:<<value>>,..,<<fieldname>>:<<value>>}
//
// example:
//
// opActivate_facing?id=2&fields={"activationDate":"2018-12-31","RS485Address":"6E","backBrightness":0,"numberOfSensors":8,"geolocation":"",
// "mfdate":"2018-10-03","SN":"000323331"}


// example of dbExecuteSQL API:

//dbExecuteSQL?sqlstatement=select * from facings;



 /* `activationDate` DATETIME NULL DEFAULT NULL,
  `deactivationDate` DATETIME NULL DEFAULT NULL,
  `RS485Address` VARCHAR(25) NOT NULL,
  `version` VARCHAR(15) NULL DEFAULT NULL,
  `deviceTypeID` INT(11) NOT NULL,
  `backBrightness` INT(11) NULL DEFAULT NULL,
  `numberOfSensors` INT(11) NULL DEFAULT NULL,
  `geolocation` VARCHAR(25) NULL DEFAULT NULL,
  `mfdate` DATETIME NULL DEFAULT NULL,
  `SN` VARCHAR(30) NULL DEFAULT NULL,
*/

