const PropertiesReader = require('properties-reader');

// Load the properties file
const properties = PropertiesReader('config.properties');

// Access properties
const dbServer = properties.get('db.server');
const dbDaba = properties.get('db.database');
const dbUser = properties.get('db.user');
const dbPass = properties.get('db.password').toString();

class Database{
    async getConnection() {
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
        return dbconfig;
    }

}

module.exports = new Database();