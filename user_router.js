var mongojs = require('mongojs');
var logger = require('./logger');
var db = mongojs('localhost:-');
var userCollection = db.collection('USER');

exports.newUser = function (req, res) {
	//req.body : user_id, user_age, user_gender, user_intro
	var id = req.body.user_id;
	var age = req.body.user_age;
	var gender = req.body.user_gender;
	var intro = req.body.user_intro;

	var nowYear = new Date().getFullYear();

	var insertData =
		{
			USER_ID: id,
			USER_AGE: nowYear+1-age,
			USER_GENDER: gender,
			USER_INTRO: intro
		}

	userCollection.insert(insertData, function (err, result) {
		if (err) {
			logger.error('error', '유저 등록 에러 : ', err);
			var fail = {
				"RESULT ": "FAIL",
				"RESULT_MSG": err
			}
			res.json(fail);
		}
		else {
			var success = {
				"RESULT": "SUCCESS",
				"RESULT_MSG": "SUCCESS"
			}
			res.json(success);
		}
	})
}

exports.showUserInfo = function (req, res) {
	var id = req.query.user_id;
	var nowYear = new Date().getFullYear();

	userCollection.findOne({ USER_ID : id }, { USER_GENDER: 1, USER_AGE: 1 , USER_INTRO: 1, _id: 0 }, function (err, doc) {
		if (err) {
			logger.error('error', '유저 정보 요청 에러 : ', err);
			res.sendStatus(500);}
		if(doc == null){
			var fail = {
				"RESULT ": "FAIL",
				"RESULT_MSG": '회원 정보가 없습니다.'
			};
			res.end(JSON.stringify(fail));
		}else{
		console.log(doc);
		if (doc == null) {

			var fail = {
				"RESULT ": "FAIL",
				"RESULT_MSG": "회원 정보가 없습니다."
			}
			res.json(fail);
		}
		else {
			doc.USER_AGE = nowYear-doc.USER_AGE+1;

			var success = {
				"RESULT": "SUCCESS",
				"INFO": {
					"USER_GENDER": doc.USER_GENDER,
					"USER_AGE": doc.USER_AGE,
					"USER_INTRO": doc.USER_INTRO
				}
			}
			res.json(success);
		}
	}
	})
}

exports.updateUserInfo = function(req, res){
	var id = req.body.user_id;
	var intro = req.body.user_intro;

	userCollection.update({USER_ID : id},{"$set": {USER_INTRO : intro}}, function(err, result){
		console.log("result" , result);
		if(err) {
			var fail = {
				"RESULT" : "FAIL",
				"RESULT_MSG" : err
			}
			res.json(fail);
		}else{
			userCollection.findOne({USER_ID : id},{ USER_INTRO : 1}, function(err, doc){
				if (err) {
					logger.error('error', '유저 정보 수정 에러 : ', err);
					res.sendStatus(500);}
						if(doc == null){
							var fail = {
								"RESULT ": "FAIL",
								"RESULT_MSG": '회원 정보가 없습니다.'
							};
							res.end(JSON.stringify(fail));
						}else{
						console.log(doc);
						if (doc == null) {
							var fail = {
								"RESULT ": "FAIL",
								"RESULT_MSG": "회원 정보가 없습니다."
							}
							res.json(fail);
						}
						else {
							doc.USER_INTRO

							var success = {
								"RESULT": "SUCCESS",
								"USER_INTRO": doc.USER_INTRO
							}
							res.json(success);
						}
					}
			})
		}
	})
}

exports.deleteUser = function(req, res){
	var id = req.body.user_id;

	userCollection.remove({USER_ID : id}, function(err, result){
		if(err){
			var fail = {
				"RESULT" : "FAIL",
				"RESULT_MSG" : err
			}
			res.json(fail);
		}else{
			var success = {
				"RESULT" : "SUCCESS",
				"RESULT_MSG" : "SUCCESS"
			}
			res.json(success);
		}
	})
}
