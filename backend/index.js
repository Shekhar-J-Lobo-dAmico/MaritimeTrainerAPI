const express = require('express');
const app = express();
const port = 8000;
//Database connection
const sql = require('mssql');
const PropertiesReader = require('properties-reader');
//const PropertiesReader = PropertiesReaderImport.default || PropertiesReaderImport;
const fs = require('fs');
const helmet = require('helmet');

app.use(express.json());
app.use(helmet());

// Load the properties file
const path = require('path');
console.log(
  fs.existsSync(path.join(__dirname,'config.properties'))
);
// Load the properties file
const properties = PropertiesReader('config.properties');

// Access properties
const dbServer = properties.get('db.server');
const dbDaba = properties.get('db.database');
const dbUser = properties.get('db.user');
const dbPass = properties.get('db.password').toString();
const token = properties.get('db.token');
const minInterval = properties.get('db.timeIntervalInMinutes');
const deactivateUserInterval = properties.get('db.deactivateUserIntervalInHrs');

var dbconfig={
  server: dbServer,
  database: dbDaba,
  user: dbUser,
  password: dbPass,
  options:{
      trustServerCertificate: true
  },
  connectionTimeout: 15000,  // ms for connecting
  requestTimeout: 60000    
}


const logsRepo = require('./repositories/logs.repositories');

const mainUrl='https://damico.staging.maritimetrainer.com/webservice/restful/server.php/';

//Create/Update Users
async function getCreateUpdateUsers() {
  try {
	  console.log('getCreateUpdateUsers()', new Date());
    const pool = await sql.connect(dbconfig);
    var result = await pool.request().execute('PROC_GETNEWSEAFARERINFOMTR');     // Call the stored procedure
        
    const respData = result.recordset;

    const url = mainUrl+'CheckUser';
    //const token = 'b6d77081557ad511f40752004839a8aa';
    console.log("token: ",token);

	  const jsonArray=[];
	
    for(let resp of respData){
      console.log("Data:", resp['ID']);
			
      const json = {
        email: resp['EMAIL'], //E-mail address
        firstname: resp['FIRSTNAME'], // Firstname
        lastname: resp['LASTNAME'], // Lastname
        rank: resp['RANK'], // Rank
        username: '', // CrewIPN // If username is null, employee_id will be use to be username
        vesselname: resp['VESSEL_NAME'], // Current Vessel Name
        vessel_signon_date: resp['SIGN_ON_DATE'], // If vessel name or signon date is null, user cannot join to vessel as crew
        vessel_signoff_date: resp['SIGN_OFF_DATE'],
        pool: resp['POOL'], // Pool Description
        group: resp['GROUP'], // Manning Agent Description
        birthdate: resp['DOB'], // Date of Birth (mm/dd/yyyy)
        employee_id: resp['ID'].toString(), //'149/632295', // Optional Parameter. But if username is not unique, employee_id is neccessary for checking unique data
        vtype: '', // Vessel Type parameter is optional. If it is not provided, it will be set to Default Vessel Type (For example: "Bulk Carrier")
        nationality: resp['NATIONALITY']
      };

      jsonArray.push(json);

    }

    const payload={
      data: jsonArray
    };

    if(jsonArray.length>0){
      const srno = await logsRepo.updateLog(null, "getCreateUpdateUsers", JSON.stringify(payload), null);
      const response = await fetch(url,{
        method:'POST', // or 'PUT' / 'PATCH'
        headers: {
          Authorization: token,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        //throw new Error(`HTTP error! status: ${response.status}`);
        console.log(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(JSON.stringify(data));
      await logsRepo.updateLog(srno, "getCreateUpdateUsers", JSON.stringify(payload), JSON.stringify(data));
        
    }

    verifyUserDetail(respData);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

//Get Details
async function getUserDetail(data) {
  try {
	  console.log('getUserDetail()', new Date());
    const url = mainUrl+'getUserDetail';
    
    for(let resp of data){
      console.log("Data:", resp['ID']);
			
      const payload={
        user: {
          username: '',
          employee_id: resp['ID'] // OPTIONAL
        }
      };
      
      const srno = await logsRepo.updateLog(null, "getUserDetail", JSON.stringify(payload), null);
        
      const response = await fetch(url,{
        method:'POST', // or 'PUT' / 'PATCH'
        headers: {
          Authorization: token,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        //throw new Error(`HTTP error! status: ${response.status}`);
        console.log(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(JSON.stringify(data));
      await logsRepo.updateLog(srno, "getUserDetail", JSON.stringify(payload), JSON.stringify(data));
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

//Verify Details
async function verifyUserDetail(data) {
  try {
	  console.log('verifyUserDetail()', new Date());
    const url = mainUrl+'verifyUser';
    
    for(let resp of data){
      console.log("Data:", resp['ID']);
			
      const payload={
        user: {
          username: '',
          employee_id: resp['ID'] // OPTIONAL
        }
      };
      
      const srno = await logsRepo.updateLog(null, "verifyUserDetail", JSON.stringify(payload), null);
        
      const response = await fetch(url,{
        method:'POST', // or 'PUT' / 'PATCH'
        headers: {
          Authorization: token,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        //throw new Error(`HTTP error! status: ${response.status}`);
        console.log(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Data: ", JSON.stringify(data));
      if(data['status']=="waiting" || data['errorcode']=="invalidparameter")
        await logsRepo.updateLog(srno, "verifyUserDetail", JSON.stringify(payload), "waiting");
      else
        await logsRepo.updateLog(srno, "verifyUserDetail", JSON.stringify(payload), JSON.stringify(data));
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

//Update Waiting Users
async function updateWaitingUsers() {
  try{
    console.log('updateWaitingUsers()', new Date());
    const url = mainUrl+'verifyUser';
    const pool = await sql.connect(dbconfig);
    var result = await pool.request().execute('PROC_MTRGETWAITINGVERIFYUSER');     // Call the stored procedure
    const respData = result.recordset;
    for(let res of respData){
      const response = await fetch(url,{
        method:'POST', // or 'PUT' / 'PATCH'
        headers: {
          Authorization: token,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: res.ReqBody
      });
      
      if (!response.ok) {
        //throw new Error(`HTTP error! status: ${response.status}`);
        console.log(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if(data['status']=="waiting" || data['errorcode']=="invalidparameter"){
        console.log("Waiting: ", res.ReqBody);
        await logsRepo.updateLog(res.SrNo, "verifyUserDetail", res.ReqBody, "waiting");
      }
      else
        await logsRepo.updateLog(res.SrNo, "verifyUserDetail", JSON.stringify(res.ReqBody), JSON.stringify(data));
    }
  }catch(error){
    console.error('Error fetching data:', error);
  }  
}

//Deactivate Users
async function deactivateUser() {
  const pool = await sql.connect(dbconfig);
  var result = await pool.request().execute('PROC_MTRGETSUSPENDEDUSERS');     // Call the stored procedure
      
  const respData = result.recordset;
  const url = mainUrl+'changeUserStatus';
  
  const payload={
    users: respData
  };

  // console.log("deactivateUser:", JSON.stringify(payload));
  const srno = await logsRepo.updateLog(null, "deactivateUser", JSON.stringify(payload), null);
       
  try {
    const response = await fetch(url, {
      method: 'POST', // or 'PUT' / 'PATCH'
      headers: {
        Authorization: token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Success:', JSON.stringify(data));
    await logsRepo.updateLog(srno, "deactivateUser", JSON.stringify(payload), JSON.stringify(data));

  } catch (error) {
    console.error('Error:', error);
  }
}

//Get List Of Certificate By Date Range
async function getlistofCertificateByDate(body) {
  const url = mainUrl+'GetlistofCertificateByDate';
  const {datestart, dateend} = body;
  // const payload={
  //   users: respData
  // };

  // console.log("deactivateUser:", JSON.stringify(payload));
  const srno = await logsRepo.updateLog(null, "getlistofCertificateByDate", JSON.stringify(body), null);
       
  try {
    const response = await fetch(url, {
      method: 'POST', // or 'PUT' / 'PATCH'
      headers: {
        Authorization: token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log('Success:', JSON.stringify(data));
    await logsRepo.updateLog(srno, "getlistofCertificateByDate", JSON.stringify(body), JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}

app.post('/api/getlistofCertificateByDate', async(req, res)=>{
  try{
      const {datestart, dateend} = req.body;
      console.log("getlistofCertificateByDate: ",JSON.stringify(req.body));
      const resp=await getlistofCertificateByDate(req.body);
      res.status(200).json({data: resp});
  }catch(err){
    console.log(err);
      res.status(500).json({data: err, column:null});
  }
});

//getExternalData();

app.get('/', (req, res) => {
  res.send('Hello from your new Node project!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  getCreateUpdateUsers();
  setInterval(getCreateUpdateUsers,minInterval*60*1000);
  updateWaitingUsers();
  setInterval(updateWaitingUsers,30*60*1000);
  deactivateUser();
  setInterval(deactivateUser,deactivateUserInterval*60*60*1000);
});