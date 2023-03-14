var mysql = require('mysql');
var dateFormate = require('dateformat');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database:"akadeklik",
  multipleStatements : true
});

con.connect(function(err,response,request) {
    if (err) throw err;
       console.log("Połączono z bazą danych");
       var day = dateFormate(new Date(),"dd/mm/yyyy");
      let applied_date = JSON.parse(JSON.stringify(day));
      console.log(applied_date);
      let sql = "select * from new_complaint";
      con.query(sql,function(err,result,fields){
        if(err) throw err;
        for(var i = 0; i < result.length;i++){
          console.log(result[i].id);
          var sql = 'select * from studentcomplaint where complaint_id = ? and status ="done"';
          con.query(sql,[result[i].complaint_id],function(err,result, fields){
            console.log(result.length);
            for(var j = 0;j < result.length;j++){
              
            }
          })
        }
    });   
  });
  
module.exports = con;