'use strict'
var express = require('express');
var socketio = require('socket.io');
var Connection = require('tedious').Connection; 
const http = require('http');
var soap = require('soap');
var fs = require('fs');
var path = require('path');
//var scraper = require("sunat-ruc-scraper2");
var resp="vacio"; 
var result = [];

var html_send = "";

var error_sunat=0;
const RUC = "20563254174";

let pool,request=null;

const sql = require('mssql');
const config = "mssql://sa:masterkey@SERVIDOR/DBFREST";

function start(){
    
    (async function () {
    try {
        pool = await sql.connect(config);
        request = pool.request();       
    } catch (err) {
        // ... error checks
        console.log(err);
        
    }
    })();
    
    sql.on('error', err => {
        if(err) throw err;
    });
    
}

start();

function inicio(){
    
    (async function () {
    try {
        var value =0;
        let result1 = await request.query(`SELECT TOP 1 SERIE,NUMERO,SERIEFAC,NUMFACTURA 
                                    FROM TIQUETSCAB 
                                    WHERE NUMERO > 145350 AND NUMROLLO=1
                                    ORDER BY NUMERO ASC;`);

                                    
            //.query('select * from mytable where id = @input_parameter')
            
        //console.log(result1);
        if(result1.rowsAffected>0)
           //////////////// await hola(result1);
           console.log(result1);
        else
            console.log("Esperando nuevos envios..." + new Date());    
        // Stored procedure
        /**        
        let result2 = await pool.request()
            .input('input_parameter', sql.Int, value)
            .output('output_parameter', sql.VarChar(50))
            .execute('procedure_name')        
        console.dir(result2)
        */
    } catch (err) {
        // ... error checks
        console.log(err);
        
    }
    })();
    
    sql.on('error', err => {
        if(err) throw err;
    });
    
}

function actualizar(NUMERO,CODIGO){
    
    (async function () {
    try {
        var value =0;
        let result1 = await request.query(` UPDATE TIQUETSCAB SET NUMROLLO=${CODIGO}
                                             WHERE NUMERO = ${NUMERO}`);
        console.log("se actualizo el registro ["+NUMERO+"] => codigo SUNAT: "+CODIGO);   
        html_send = "\nse actualizo el registro ["+NUMERO+"] => codigo SUNAT: "+CODIGO;                                         
        
    } catch (err) {
        // ... error checks
        console.log(err);
        
    }
    })();
    
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function hola(data){
    let ser_fac,nro_fac,tipo,numero="";     
    console.log("------------------------------------");
    //console.log(data.rowsAffected);
    data.recordset.forEach((valor,index)=>{
        tipo="01";
        ser_fac = valor.SERIEFAC;
        nro_fac = valor.NUMFACTURA;
        nro_fac = nro_fac;  
        numero =  valor.NUMERO;
        
        if(ser_fac=="BO01") 
            tipo="03";        
        
    });
    var FILE_NOMBRE = `${RUC}-${tipo}-${ser_fac}-${nro_fac}.zip`;
    
   
    
    try{
         var data = fs.readFileSync(`../../XML/${FILE_NOMBRE}`,{encoding:"base64"});    
    }catch(e){
        console.log("NUMERO: "+numero);
        console.log(e);
        actualizar(numero,0);
    }
        
    var url = "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl"; 
    //var url = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService?wsdl";
    
    
    var options = {
        forceSoap12Headers: false, 
        wsdl_options: {timeout: 7000}
    };
        
    soap.createClient(url, options, function (err, client) {
        console.log("Consultando a sunat");
        if(!err){
            var wsSecurity = new soap.WSSecurity("20563254174JSJ19844", "PIZARRO+-+", {});
                client.setSecurity(wsSecurity); 
                client.sendBill({
                    fileName:FILE_NOMBRE,
                    contentFile:data
                },async (err, res) => {
                    if(err){

                        var parseString = require('xml2js').parseString;
                        var xml = err.body;
                        parseString(xml, function (err, result) {
                            
                        try{    
                            var pre = result['soap-env:Envelope']['soap-env:Body'];
                            pre.forEach((ii)=>{
                                //console.log(ii['soap-env:Fault']);
                                var pre2 = ii['soap-env:Fault'];
                                    pre2.forEach(async (iii)=>{
                                        //console.log(iii['faultcode'].toString());
                                        if(iii['faultcode'].toString()=="soap-env:Client.1033"){
                                            //console.log("ya enviado " + numero);
                                            await actualizar(numero,1033);
                                        }
                                    });
                               
                            });
                         } catch (e) {
                                
                                console.log(e);
                            } 
                            
                        });
                        
                        //console.log(err); 
                    }else{ 
                        try{
                         //console.log(res.applicationResponse);
                         var ruta = '../../RESPUESTAS/R-'+FILE_NOMBRE;     
                         fs.writeFileSync(ruta, Buffer.from(res.applicationResponse, 'base64').toString('binary'), 'binary' )
                         await actualizar(numero,2);
                          } catch (e) {
                                console.log(e);
                            }                   
                    }
                });
        }else{
            console.log(err);
        }
    });
 }



function envio_soap(){
    var url = 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl';
    var tik2= {'ticket':201801801203830};
    var wsSecurity = new soap.WSSecurity('20600853563JSJ19877', 'PIZARRO+-+', {});
  soap.createClientAsync(url).then((client) => {
    client.setSecurity(wsSecurity);
    return client.getStatus(tik2);
  }).then((result) => {
    return saveCDR(result,tik2.ticket)
  });
 } 
 function saveCDR(file,nombre){
    var ruta = './public/RESPUESTAS/'+nombre+'.zip';    
    //fs.writeFileSync(ruta, Buffer.from(file.status.content, 'base64').toString('binary'), 'binary' )
    return nombre; 
 }
// envio_soap(); 


setInterval( async() => {   
    
    rp('http://localhost/sql/index.php/CPE/autoXML')
    .then(async function (htmlString) {
        //console.log(htmlString);        
        await inicio();
        html_send=htmlString;
    })
    .catch(function (err) {
        // Crawling failed...
    });
    
    
  }, 2000);
 
const app = express();//instancia de express
const server = http.createServer(app);//creando el server con http y express como handle request
const io = socketio(server);//iniciando el server de socket.io
const PORT = process.env.PORT || 443;
var rp = require('request-promise');

 
app.use(express.static(path.join(__dirname, 'public')));//middleware de express para archivos estaticos
 
 //router
 app.get('/login',(req,res)=>{
    res.send(result);
 });
 app.get('/',(req,res)=>{
    res.setHeader('Content-Type', 'application/json');
    res.send(resp);
 });
 
 server.listen(PORT,()=>{
   console.log(`Server running in http://localhost:${PORT}`);
 });

 
io.on('connection', function(socket){
  console.log(`client: ${socket.id}`);
  
  setInterval(() => {
    socket.emit('server/start', html_send);
           
  }, 1500);
  
  //enviando numero aleatorio cada dos segundo al cliente
  setInterval(() => {
    socket.emit('server/random', Math.random());       
  }, 2000);
  
  //recibiendo el numero aleatorio del cliente
  socket.on('client/random', (num) => {
    console.log(num)
  });
});