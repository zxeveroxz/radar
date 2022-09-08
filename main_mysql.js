'use strict'
var express = require('express');
const mysql = require('mysql2/promise');
const http = require('http');
var soap = require('soap');
var fs = require('fs');
var path = require('path');
const { Console } = require('console');
var resp = null;

let request = null;

let config = {
  host: '25.21.196.223',
  user: 'externo2',
  password: '@pocalipsiZ20',
  database: 'BD_FACTURADOR'
};


const pool = mysql.createPool(config)
async function query(sql, param = []) {
  return await pool.execute(sql, param);
}

(async () => {
  let sql = "SELECT * FROM lista_empresas ";
  let param = [];
  const [rows, fields] = await query(sql, param);
  //console.log(rows);
})();

let listar_ruc = async () => {
  let sql = "SELECT * FROM lista_empresas ";
  let param = [];
  const [rows, fields] = await query(sql, param);
  return rows;
}


let lista_xml = async () => {
  let sql = "SELECT CONVERT(UNCOMPRESS(XML) USING utf8) XML FROM tbl2_XML where ruc_=? and tipo = ? and cdr_codigo =  ?  limit 20";
  let param = ['20125844589', '01','null'];
  const [rows, fields] = await query(sql, param);
  return rows;
}


function envio_soap() {
  var url = 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService?wsdl';
  var tik2 = { 'ticket': 201801801203830 };
  var wsSecurity = new soap.WSSecurity('20600853563JSJ19877', 'PIZARRO+-+', {});
  soap.createClientAsync(url).then((client) => {
    client.setSecurity(wsSecurity);
    return client.getStatus(tik2);
  }).then((result) => {
    return saveCDR(result, tik2.ticket)
  });
}
function saveCDR(file, nombre) {
  ruta = './public/RESPUESTAS/' + nombre + '.zip';
  //fs.writeFileSync(ruta, Buffer.from(file.status.content, 'base64').toString('binary'), 'binary' )
  return nombre;
}

const app = express();//instancia de express
const server = http.createServer(app);//creando el server con http y express como handle request
const PORT = process.env.PORT || 400;

app.use(express.static(path.join(__dirname, 'public')));//middleware de express para archivos estaticos

//router
app.get('/lista', async (req, res) => {
  res.json(await lista_xml());
});
app.get('/demo', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(await listar_ruc());
});

server.listen(PORT, () => {
  console.log(`Server running in http://localhost:${PORT}`);
});

