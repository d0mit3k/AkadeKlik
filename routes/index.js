var express = require('express');
var mysql = require('mysql');
var http = require('http');
var con = require('../db/checkconn.js');
var path = require('path');
var router = express.Router();
var session = require('express-session');
var bodyParser = require('body-parser');
var alert = require('alert-node');
var dateFormate = require('dateformat');
var fs = require('fs');
var multer = require("multer");
var storage = multer.diskStorage({
    destination: function(req, file, callback){
        callback(null, './public/images/upload');
    },
    filename: function(req, file, callback){
        callback(null, Date.now() + '.jpg');
    }
});
var upload = multer({storage: storage});

router.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

router.get('/', function(request, response, next) {
  response.render('index', { title: 'AkadeKlik' });
});

router.get('/admin_login', function(request, response, next) {
    response.render('admin_login', { title: 'Logowanie - Panel Administracyjny AkadeKlik' });
});

router.post('/auth', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		con.query('SELECT * FROM admin_login WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
        request.session.username = username;
				response.redirect('/admin_panel');
			} else {
        response.send('Niepoprawna nazwa użytkownika bądź hasło');
        response.end();
			}			
		});
	} else {
		response.send('Wprowadź nazwę użytkownika oraz hasło'); 
		response.end();
	}
});

router.get('/student_login', function(req, res, next) {
  res.render('student_login', { title: 'Logowanie - AkadeKlik' });
});

router.post('/studentauth', function(request, response) {
	var email = request.body.email;
	var password = request.body.password;
	if (email && password) {
		con.query('SELECT * FROM student_login WHERE email = ? AND password = ?', [email, password], function(error, results, fields) {
			if (results.length > 0) {
				request.session.loggedin = true;
        request.session.username = email;
				response.redirect('/studentdash');
			} else {
				response.send('Niepoprawny adres email bądź hasło');
			}			
			response.end();
		});
	} else {
		response.send('Wprowadź nazwę użytkownika oraz hasło'); 
		response.end();
	}
});

router.use(session({
	secret: 'secret2',
	resave: true,
	saveUninitialized: true
}));

router.get('/new_reg', function(request, response, next) {
  response.render('new_reg');
});

router.post('/new_reg', function(req, res, next) {
con.query("SELECT * FROM student_reg WHERE email = '"+req.body.email+"'",function(err,result,fields){
  if(result.length > 0)
  {
    con.query("select * from student_login where email = ?",[req.body.email],function(err,result,fields){
      if(result.length > 0){
        res.render('new_reg',{message : 'Podany adres email jest zajęty'});
      }
      else{
        con.query("INSERT INTO student_login(email,password) VALUES ('"+req.body.email+"','"+req.body.password+"')",function(err){
          if(err) throw err;
        });
      }
    });  
  }
  else{
    res.render('new_reg',{message : 'Podany adres email jest zajęty'});
  }
});
});

router.get('/admin_reg', function(request, response, next) {
  response.render('admin_reg');
});

router.post('/admin_reg', function(req, res, next) {
con.query("SELECT * FROM admin_login WHERE username = '"+req.body.username+"'",function(err,result,fields){
  if(result.length > 0){
      res.render('admin_reg',{message : 'Konto o takiej nazwie już istnieje'});
  }
  else{
    con.query("INSERT INTO admin_login(username,password) VALUES ('"+req.body.username+"','"+req.body.password+"')",function(err){
      if(err) throw err;
      res.render('admin_reg');
    }); 
  }
});
});

router.get('/admin_panel', function(request, response) {
	if (request.session.loggedin) {
      var username = request.session.username;
      response.render('admin_panel',{username});
	  } else {
      response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
      response.end();
	  }
  });

router.get('/complaint', function (request, response, next) {
  if (request.session.loggedin) {
    con.query('select * from new_complaint;select count(status) from studentcomplaint where status = "Rozwiązano";select count(status) from studentcomplaint', function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('complaint',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/addcomplaint', function (request, response, next) {
  if (request.session.loggedin) {
    var complaint = request.body.complaintname;
    con.query("INSERT INTO new_complaint (complaint_name) VALUES ('"+request.body.complaintname+"')",function (error, result, fields) {
      if (error) throw error;
      response.redirect('/complaint');
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/solved/:id', function (request, response, next) {
  if (request.session.loggedin) {
    con.query("SELECT b.description_id, b.email, b.applied_date, b.complaint_id,b.complaint, b.status, b.replay, s.fullname, a.complaint_name FROM new_complaint a INNER JOIN studentcomplaint b ON a.id = b.complaint_id INNER JOIN student_reg s on s.email = b.email where b.complaint_id = ? and status = 'Rozwiązano';",[request.params.id],function(err,result,fields){
      if(err) throw err;
      let data = JSON.parse(JSON.stringify(result));
      response.render('view_complaint',{data:data});
    });    
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/waiting/:id', function (request, response, next) {
  if (request.session.loggedin) {
      con.query("SELECT b.description_id, b.email, b.applied_date, b.complaint_id,b.complaint, b.status, b.replay, s.fullname, a.complaint_name FROM new_complaint a INNER JOIN studentcomplaint b ON a.id = b.complaint_id INNER JOIN student_reg s on s.email = b.email where b.complaint_id = ? and (status = 'Oczekuje' or status = 'Nie widziany');",[request.params.id],function(err,result,fields){
        if(err) throw err;
        let data = JSON.parse(JSON.stringify(result));
        response.render('view_complaint',{data:data});
      });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/wait/:description_id', function (request, response, next) {
  if (request.session.loggedin) {
    con.query("update studentcomplaint set status = 'Oczekuje'  where description_id = ?",[request.params.description_id],function(err,result,fields){
    });
    con.query("select complaint_id from studentcomplaint where description_id = ?",[request.params.description_id],function(err,result,fields){
      if (err) throw err;
      response.redirect('/waiting/'+result[0].complaint_id); 
    })
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/update/:description_id',function(request,response,next){
  if (request.session.loggedin) {
    con.query("UPDATE studentcomplaint SET replay = '"+request.body.reply+"', status = 'Rozwiązano' WHERE description_id = ?",[request.params.description_id], function(err,results,fields)
    {
      if (err) throw err;
    });
    con.query("select complaint_id from studentcomplaint where description_id = ?",[request.params.description_id],function(err,result,fields){
      if (err) throw err;
      response.redirect('/waiting/'+result[0].complaint_id);
    })
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }  
});

router.get('/remove_complaint/:id', function(request, response, next) {
  if (request.session.loggedin) {
    con.query("delete new_complaint,studentcomplaint from new_complaint inner join studentcomplaint ON new_complaint.id = studentcomplaint.complaint_id where new_complaint.id = ?;",[request.params.id], function (error, result, fields) {
      if (error) throw error;
      response.redirect('/complaint');
  });
}else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  } 
});

router.get('/leave', function(request, response, next) {
  if (request.session.loggedin) {
    con.query('select a.*,b.fullname,b.room_no,b.fathername,b.gcontact from student_night_out as a inner join student_reg as b on a.email = b.email where status = "Nie widziane"', function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('leave',{data:data});
  });
}else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  } 
});

router.get('/nightout_history', function(request, response, next) {
  if (request.session.loggedin) {
    con.query('select a.*,b.fullname,b.room_no,b.fathername,b.gcontact from student_night_out as a inner join student_reg as b on a.email = b.email where status = "Zgoda" OR status = "Odmowa"', function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('nightout_history',{data:data});
  });
}else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  } 
});

router.post('/updateleave/:id',function(request,response,next){
  if (request.session.loggedin) {
    con.query('UPDATE student_night_out SET status = ? WHERE id = ?',[request.body.leave,request.params.id], function(err,results,fields)
    {
      if (err) throw err;
      response.redirect('/leave');
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }  
});

router.get('/studentreg', function(request, response, next) {
  if (request.session.loggedin) {
    con.query("select * from hostel_details;",function(err,result,fields){
      if (err) throw err;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentreg',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/studentreg', function(req, res, next) {
    var fullname = req.body.fullname;
    var gender = req.body.gender;
    var dob = req.body.bdate;
    var contact_no = req.body.contact_no;
    var email = req.body.email;
    var address = req.body.address;
    var std = req.body.class;
    var branch = req.body.branch;
    var room = req.body.room_no;
    var fathername = req.body.fathername;
    var mothername = req.body.mothername;
    var other = req.body.other;
    var relation = req.body.relation;
    var gcontact = req.body.gcontact_no;
    var gemail = req.body.gemail;

    con.query("select email from student_reg where email = ?",[email],function(err,result,fields){
      if(err) throw err;
      else if(result.length>0){
        res.render('studentreg',{
          message : 'Taki student już istnieje w bazie danych'
        });
      }else{
        var sql = "INSERT INTO student_reg (`fullname`,`gender`,`dob`,`contact_no`,`email`,`address`,`class`,`branch`,`room_no`,`fathername`,`mothername`,`other`,`relation`,`gcontact`,`gemail`) VALUES ('"+fullname+"','"+gender+"' , '"+dob+"','"+contact_no+"','"+email+"','"+address+"','"+std+"','"+branch+"','"+room+"','"+fathername+"','"+mothername+"','"+other+"','"+relation+"','"+gcontact+"','"+gemail+"')";
        con.query(sql,function(err,results,fields){
          if(err) throw err;
          res.render('studentreg',{
            message : 'Zarejestrowano pomyślnie'
          });
        });
      }
    }); 

    
  });

router.get('/attendance', function(request, response, next) {
  if (request.session.loggedin) {
    con.query("select * from student_reg",function(err,result,fields){
      let data = JSON.parse(JSON.stringify(result));
    response.render('attendance',{data:data});
    }); 
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/attendance', function(request, response, next) {
  if (request.session.loggedin) {
    var obecnosc = request.body.obecWartosc;
    var id = request.body.obecId;
    var sql = "update student_reg set attend = ? where id = ?;";
    con.query(sql,[obecnosc,id],(err,result,fields) => {
      if(err) throw err;
      response.sendStatus(200);
      response.end();
    });
  }else{
  response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
  response.end();
  }
});

router.get('/notice', function(request, response, next) {
  if (request.session.loggedin) {
    con.query("select id,notice,update_date from notice;select fullname,pic_name from student_reg where email = ?;",[request.session.username], function (error, result, fields) {
    if (error) throw error;
    let data = JSON.parse(JSON.stringify(result));
    response.render('notice',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/noticeupdate', function(request, response, next) {
  if (request.session.loggedin) {
    var sql = "select * from notice";
    con.query(sql,function(err,result,fields){
      if(err) throw err;
      response.render('noticeupdate');
    });
  } else {
  response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
  response.end();
  }
});

router.post('/noticeupdate', function(request, response, next) {
  if (request.session.loggedin) {
    var ogloszenie = request.body.trescOgloszenia;
    var day = dateFormate(new Date(),"dd/mm/yyyy");
    var date = JSON.parse(JSON.stringify(day));
    var sql = "insert into notice (notice,update_date) values(?,?);";
    con.query(sql,[ogloszenie,date],(err,result,fields) => {
      if(err) throw err;
      response.render('noticeupdate');
    });
  }else{
  response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
  response.end();
  }
});

router.get('/hosteldetails', function(request, response, next) {
  if (request.session.loggedin) {
      let sql = "select * from hostel_details";
      con.query(sql,function(error,result,fields){
        if(error) throw error;
          let data = JSON.parse(JSON.stringify(result));
          response.render('hosteldetails',{data:data});
      })
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/hostel_info/:hostel_no/:id', function(request, response, next) {
  if (request.session.loggedin) {
      let sql = "select * from hostel_details where id = ?;select * from ??;select count(`status`) as available_room from ?? where status = 'Dostępny';select count(`status`) as occupied_room from ?? where status = 'Pokój zajęty'";
      con.query(sql,[request.params.id,request.params.hostel_no,request.params.hostel_no,request.params.hostel_no],function(error,result,fields){
        if(error) throw error;
        let data = JSON.parse(JSON.stringify(result));
        response.render('hostel_info',{data:data});
      });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/remove_hostel/:id', function(request, response, next) {
  if (request.session.loggedin) {
    var hostel = request.body.hostel;
    var sql = "drop table ??;delete from hostel_details where id = ?;update student_reg set hostel = ' ' , room_no = 'undefined'";
    con.query(sql,[hostel,request.params.id],function(err,result,fields){
      if(err) throw err;
      response.redirect('/hosteldetails');
    });
    
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/room_details/:hostel_no/:room_no', function(request, response, next) {
  if (request.session.loggedin) {
      let sql = "select * from ?? where room_no = ?;select * from student_reg where room_no = 'undefined';select * from student_reg where room_no = ?";
      con.query(sql,[request.params.hostel_no,request.params.room_no,request.params.room_no],function(error,result,fields){
        if(error) throw error;
        let data = JSON.parse(JSON.stringify(result));
        response.render('room_details',{data:data});
      })
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/allocateroom/:id',function(request,response,next){
  if (request.session.loggedin) {
    var hostelno = request.body.hostel_no;
    var roomno = request.body.room_no;
    var sql = "select * from ?? where room_no = ?";
    con.query(sql,[hostelno,roomno],function(err,result,fields)
    {
      if (err) throw err;
      console.log(result);
      result.forEach((row) => {
        var stat = `${row.status}`;
        console.log(stat);
        if(`${row.status}` == "Dostępny"){
          var sql = "update student_reg set hostel = ? ,room_no = ? where id = ?;update ?? SET occupied_bed = case when occupied_bed < total_bed then occupied_bed + 1 else occupied_bed end, available_bed = case when available_bed > 0 then total_bed - occupied_bed else available_bed end, `status` = case when occupied_bed = total_bed then 'Pokój zajęty' else 'Dostępny' end where room_no = ?;";
          con.query(sql,[hostelno,roomno,request.params.id,hostelno,roomno],function(err,result,fields){
            if (err) throw err;
          });
        };
      });
      response.redirect('/room_details/'+hostelno+"/"+roomno);
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }  
});

router.post('/removestud/:id', function(request,response,next){
  if(request.session.loggedin){
    var hostelno = request.body.hostel;
    var roomno = request.body.room_no;
    var sql = "update student_reg set hostel = ' ', room_no = 'undefined' where id = ?;update `"+hostelno+"` SET occupied_bed = case when occupied_bed > 0 then occupied_bed - 1 else occupied_bed end, available_bed = case when available_bed < total_bed then available_bed + 1 else available_bed end, `status` =  'Dostępny' where room_no = ?;";
    con.query(sql,[request.params.id,roomno],function(err,result,fields){
      if(err) throw err;
      response.redirect('/room_details/'+hostelno+"/"+roomno);
    })
  }else{
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
})

router.post('/addhostel', function(request, response, next) {
  if (request.session.loggedin) {
    var hostelname = request.body.hostelname;
    var category = request.body.category;
    var totalroom = request.body.totalroom;
    var occupied_room = 0;
    var available_room = totalroom;
    var total_bed = request.body.totalbed;
    var occupied_bed = 0;
    var available_bed = total_bed;

    con.query("create table ?? (id int(11) NOT NULL AUTO_INCREMENT,hostel_no varchar(20),room_no int(100),total_bed varchar(30),occupied_bed VARCHAR(50),available_bed VARCHAR(50),status varchar(20) default 'Dostępny',PRIMARY KEY (id)) ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1",[hostelname])
    for(let i = 1; i <= totalroom; i++){
      con.query("insert into ??(`hostel_no`,`room_no`,`total_bed`,`occupied_bed`,`available_bed`) VALUES ('"+hostelname+"','"+i+"','"+total_bed+"','"+occupied_bed+"','"+available_bed+"')",[hostelname])  
    }
    con.query("INSERT INTO hostel_details (`hostel_no`,`category`,`rector_name`,`total_room`,`occupied_room`,`available_room`,`total_bed`) VALUES (?,?,?,?,?,?,?);",[request.body.hostelname,category,request.body.rectorname,totalroom,occupied_room,available_room,total_bed],
    function(error,count){
      if (error) throw error;
    response.redirect("/hosteldetails");
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/studentdetails', function(request, response, next){
  if (request.session.loggedin) {
     con.query("select * from student_reg",function(err,result,fields){
        if(err) throw err;
        let data = JSON.parse(JSON.stringify(result));
        response.render('studentdetails',{data:data});
     });
    
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/studentdetails_info/:id', function(request, response, next) {
  if (request.session.loggedin) {
    let sql = "select * from student_reg where id = '"+request.params.id+"'";
    con.query(sql,function(err,result,fields){
      if(err) throw err;
      result.forEach((rows)=>{
        
      });
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentdetails_info',{data:data});
    });
    
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/edit_student_details/:id', function(req, response, next) {
  if (req.session.loggedin) {
    var id = req.params.id;
    var fullname = req.body.fullname;
    var gender = req.body.gender;
    var dob = req.body.bdate;
    var contact_no = req.body.contact_no;
    var email = req.body.email;
    var address = req.body.address;
    var std = req.body.class;
    var branch = req.body.branch;
    var room = req.body.room_no;
    var fathername = req.body.fathername;
    var mothername = req.body.mothername;
    var other = req.body.other;
    var relation = req.body.relation;
    var gcontact = req.body.gcontact_no;
    var gemail = req.body.gemail;

  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/upload_photo/:id', upload.single('nazwapliku'), function(req, res, next) {
  if (req.session.loggedin) {
    var filename = req.file.filename;
    console.log("Nazwa pliku: "+filename);
    if(!filename){
      res.send('Nie wybrano pliku');
    }
    else{
      var sql = 'update student_reg set pic_name = ? where id = ?';
      con.query(sql,[filename,req.params.id], function(err,result,fields){
        if(err) throw err;
        res.send(filename);
      });
    }
  } else {
    res.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    res.end();
  }
});

router.get('/studentdash', function(request, response, next) {
  if (request.session.loggedin) {
    con.query('select fullname,pic_name,hostel,room_no from student_reg where email = ?',[request.session.username], function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentdash',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/studentprofile', function(request, response, next) {
  if (request.session.loggedin) {
    con.query('select * from student_reg where email = ?',[request.session.username], function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentprofile',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/profileedit/:id',function(request,response,next){
  if(request.session.loggedin){
    var sql = "update student_reg set fullname = ?,gender = ?,dob = ?, contact_no = ?,email = ?,address = ?, class = ?, branch = ? where id = ?;";
    con.query(sql,[request.body.fullname,request.body.gender,request.body.dob,request.body.contact_no,request.body.email,request.body.address,request.body.studclass,request.body.branch,request.params.id],function(err,result,fields){
      if(err) throw err;
      response.redirect('/studentprofile');
    })
  }
}); 

router.get('/studentcomplaint', function(request, response, next) {
  if (request.session.loggedin) {
    con.query("select * from new_complaint;select * from studentcomplaint where email = ? and not status = 'Nie widziany';select * from studentcomplaint where email = ? and not status = 'Rozwiązano';select fullname,pic_name from student_reg where email = ?;",[request.session.username,request.session.username,request.session.username,request.session.username],function(err,result,fields){
      if(err) throw err;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentcomplaint',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.get('/done', function(request, response, next){
  if (request.session.loggedin) {
    var value = "Rozwiązano";
    con.query('select * from studentcomplaint where email = ?',[request.session.username], function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentcomplaint',{data:data});
    });
     
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!' );
    response.end();
  }
});

router.get('/complete_complaints',function(request,response,next){
  if (request.session.loggedin) {
    con.query('select * from studentcomplaint where email = ?',[request.session.username], function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentcomplaint',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
})

router.post('/studentcomplaint', function(req, res) {
  if (req.session.loggedin) {
    var category_id = req.body.category;
    var complaint = req.body.complaint;
    var email = req.session.username;
    var day = dateFormate(new Date(),"dd/mm/yyyy");
    let applied_date = JSON.parse(JSON.stringify(day));
    
  let sql = "INSERT INTO studentcomplaint(email,applied_date,complaint_id,complaint,status,replay) VALUES ('"+req.session.username+"','"+applied_date+"','"+category_id+"','"+complaint+"','Nie widziany','Bez odpowiedzi')";
  con.query(sql, function(err,results){ 
    if(err) throw err;
    res.redirect('studentcomplaint');
  });
  } else {
    res.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    res.end();
  }
});

router.get('/studentnightout', function(request, response, next) {
  if (request.session.loggedin) {
    con.query("select a.*,b.fullname,b.room_no,b.fathername,b.gcontact,b.pic_name from student_night_out as a inner join student_reg as b on a.email = b.email where a.email = ?;select fullname,pic_name from student_reg where email = ?;",[request.session.username,request.session.username], function (error, result, fields) {
      if (error) throw error;
      let data = JSON.parse(JSON.stringify(result));
      response.render('studentnightout',{data:data});
    });
  } else {
    response.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    response.end();
  }
});

router.post('/studentnightout', function(req, res, next) {
  if (req.session.loggedin) {
  var username = req.session.username;
  var reason = req.body.reason;
  var goingdate = req.body.goingdate;
  var returndate = req.body.returningdate;
  var day = dateFormate(new Date(),"dd/mm/yyyy");
  var applied_date = JSON.parse(JSON.stringify(day));

  let sql = "INSERT INTO student_night_out(email,applied_date,reason, going_date,return_date,status) VALUES('"+username+"','"+applied_date+"','"+reason+"','"+goingdate+"','"+returndate+"','Nie widziane')";

  con.query(sql,function(err){
    if(err) throw err;
    res.redirect('/studentnightout');
    });
  } else {
    res.send('Zaloguj się, aby uzyskać dostęp do tej strony!');
    res.end();
  }
});

router.get('/logout',function(req,res,next){    
  req.session.destroy(function(err){ 
      if(err){  
          console.log(err);  
      }  
      else  
      {  
          res.redirect('/');  
      }  
  });  
}); 

module.exports = router;