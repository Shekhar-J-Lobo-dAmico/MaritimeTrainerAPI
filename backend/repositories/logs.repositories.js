//Database connection
const sql = require('mssql');

const database = require('../database/database');

class LogsRepository{
    async updateLog(srno, apiName, req, res){
        try{
            const pool = await sql.connect(await database.getConnection());
            var result = await pool.request()
                .input('SrNo', sql.Int, srno??0)              
                .input('APIName', sql.NVarChar(50), apiName)              
                .input('ReqBody', sql.NVarChar(sql.MAX), req.toString())              
                .input('RespStatus', sql.NVarChar(sql.MAX), res??"")              
                .execute('PROC_MTRUpdateAPILog');  
            return result.recordset?result.recordset[0].SrNo:null; 
        }catch(err){
            console.log("updateLog: ", err);
        }
    }
}


module.exports = new LogsRepository();
