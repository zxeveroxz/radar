'use strict'
var express = require('express');
const mysql = require('mysql2/promise');
const http = require('http');
var soap = require('soap');
var fs = require('fs');
var path = require('path');

const xl = require('excel4node');
const wb = new xl.Workbook();
const ws = wb.addWorksheet('Worksheet Name');


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
  let param = ['20125844589', '01', 'null'];
  const [rows, fields] = await query(sql, param);
  return rows;
}

let lista_xml_error = async () => {
  //ID DE EJEMPLO: 948594
  try {
    let sql = `SELECT 
                      ruc_, raz, x.idx,  Date_Format(xml_fecha,'%Y-%m-%d %H:%i:%s') xml_fecha, xml_nombre, cdr_nombre, cdr_codigo , CONVERT(UNCOMPRESS(cdr) USING utf8) cdr
                  FROM 
                      tbl2_XML x inner join tbl_user u ON x.ruc_=u.ruc 
                  where 
                     cdr_nombre = ? and xml_fecha > (NOW() - INTERVAL 1 MONTH)  and cdr_codigo = ? and xml_fecha_envio is not null 
                  `;
    let param = ['', 0];
    const [rows, fields] = await query(sql, param);
    return rows;
  } catch (error) {
    console.log(error);
    return error;
  }
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
app.get('/lista_error', async (req, res) => {
  let data = await lista_xml_error();

  //Write Data in Excel file
  let rowIndex = 2;
  data.forEach(record => {
    let columnIndex = 1;
    Object.keys(record).forEach(columnName => {
      ws.cell(rowIndex, columnIndex++)
        .string(record[columnName] + ' ')
    });
    rowIndex++;
  });

  let documento = "error.xlsx";

  try {
    if (fs.existsSync(documento)) {
      fs.unlinkSync(documento)
      wb.write(documento);
    }else{
      wb.write(documento);
    }
  } catch (err) {
    console.error(err)
  }

  


  res.json(data);
});

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

