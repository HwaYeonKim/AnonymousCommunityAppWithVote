var mongojs = require('mongojs');
var logger = require('./logger');

var db = mongojs('localhost:-');
var userCollection = db.collection('USER');
var quesCollection = db.collection('QUESTION');
var commCollection = db.collection('Q_COMMENT');

exports.voteOXAB = function (req, res) {
	var q_id = req.params.q_id;
	console.log('req.body : ', req.body);
	// user_id, q_id, vote_value

	var user_id = req.body.user_id;
	var id = mongojs.ObjectId(q_id);
	var vote_value = parseInt(req.body.vote_value) ;

	quesCollection.findOne({ _id: id }, { Q_VOTER1: 1 , Q_VOTER2 : 1}, function (err, doc) {
		if (err) {
			logger.error('error', '투표 에러 : ', err);
			var fail = {
				"RESULT": "FAIL",
				"RESULT_MSG ": err
			}
			res.json(fail);
		}

		var vote1, vote2;
		console.log('find doc : ', doc);
//		if(doc == undefined) {vote1 = []; vote2 = [];}
//		else {
	vote1 = doc.Q_VOTER1; vote2 = doc.Q_VOTER2;
	//}

		if (vote_value == 1) { //like it
			vote1.push(user_id);
			quesCollection.update({ _id: id }, { "$set": { Q_VOTER1: vote1 } }, function (err, result){
			if(err) res.sendStatus(500);
			voteResultFun(id, res);
		});

		}else if (vote_value == 2) { //like it
			vote2.push(user_id);
			quesCollection.update({ _id: id }, { "$set": { Q_VOTER2: vote2 } }, function(err, result){
				if(err) res.sendStauts(500);
				voteResultFun(id, res);
			 });
		}else{
			var fail = {
				"RESULT": "FAIL",
				"RESULT_MSG ": err
			}
			res.json(fail);
		}
	})
}

function voteResultFun(q_id, res){

	quesCollection.findOne({ _id : q_id}, { Q_VOTER1 : 1 , Q_VOTER2 : 1 }, function(err, doc){
		if(err) {
			logger.error('error', '투표 에러 : ', err);
			res.sendStatus(500);}

		var vote1 = doc.Q_VOTER1.length;
		var vote2 = doc.Q_VOTER2.length;
		console.log('vote1 : ', vote1);
		console.log('vote2 :', vote2);
		var totalvote = vote1 + vote2;
		vote1 = Math.round((vote1/totalvote)*100);
		vote2 = Math.round((vote2/totalvote)*100);
			var success = {
			"RESULT" : "SUCCESS",
			"RESULT_MSG" : "SUCCESS",
			"Q_VOTER1" : vote1,
			"Q_VOTER2" : vote2,
			"USER_VOTE" : true
		}
		res.json(success);
	})
}

exports.likeQorNot = function (req, res) {
	var q_id = req.params.q_id;
	console.log('req.body : ', req.body);

	var user_id = req.body.user_id;
	var id = mongojs.ObjectId(q_id);
	var like_onoff = (req.body.like_onoff === "true");

	quesCollection.findOne({ _id : id }, { Q_LIKER: 1 }, function (err, doc) {
		if (err) {
			logger.error('error', '좋아요 에러 : ', err);
			var fail = {
				"RESULT": "FAIL",
				"RESULT_MSG ": err
			}
			res.json(fail);
		}
		var before;
		if(doc == undefined){ console.log('undefined error');before = [];}
		else before = doc.Q_LIKER;

		if (like_onoff) { //like it
			before.push(user_id);
			quesCollection.update({ _id: id }, { "$set": { Q_LIKER: before } });
			var likecnt = before.length;
			var success1 = {
			"RESULT" : "SUCCESS",
			"RESULT_MSG" : "SUCCESS",
			"Q_LIKER" : likecnt,
			"USER_LIKE" : true
			}
			res.json(success1);
		} else { // unlike it
			if(before.length == 0){
				var success2 = {
					"RESULT" : "SUCCESS",
					"RESULT_MSG" : "SUCCESS",
					"Q_LIKER" : 0,
					"USER_LIKE" : false
					}
					res.json(success2);
			}else{
			before.some(function (data, index){
				if(data === user_id){
					before.splice(index, 1);
					quesCollection.update({ _id: id }, { "$set": { Q_LIKER: before } });
					var likecnt = before.length;
					var success2 = {
					"RESULT" : "SUCCESS",
					"RESULT_MSG" : "SUCCESS",
					"Q_LIKER" : likecnt,
					"USER_LIKE" : false
					}
					res.json(success2);
					return data === user_id;
				}
			});
			}
		}
	})
}


exports.hideQorNot = function (req, res) {
	var q_id = req.params.q_id;
	console.log('req.body : ', req.body);
	// user_id, q_id, hide_onoff

	var user_id = req.body.user_id;
	var id = mongojs.ObjectId(q_id);
	var hide_onoff = (req.body.hide_onoff === "true");

	quesCollection.findOne({ _id: id }, { Q_HIDER: 1 }, function (err, doc) {
		if (err) {
			var fail = {
				"RESULT": "FAIL",
				"RESULT_MSG ": err
			}
			res.json(fail);
		}

		var before = doc.Q_HIDER;

		var success = {
			"RESULT" : "SUCCESS",
			"RESULT_MSG" : "SUCCESS"
		}

		if (hide_onoff) { //like it
			before.push(user_id);
			console.log('like: ', before);
			quesCollection.update({ _id: id }, { "$set": { Q_HIDER: before } });
			res.json(success);
		} else { // unlike it
			before.forEach(function (data, index) {
				if (data == user_id) {
					before.splice(index, 1);
					console.log('after remove : ', before);
					quesCollection.update({ _id: id }, { "$set": { Q_HIDER: before } });
					res.json(success);
				}
			})
		}
	})
}

exports.reportQ = function (req, res) {
	var q_id = req.params.q_id;
	console.log('req.body : ', req.body);
	// user_id, q_id, hide_onoff

	var user_id = req.body.user_id;
	var id = mongojs.ObjectId(q_id);

	quesCollection.findOne({ _id: id }, { Q_REPORTER: 1 }, function (err, doc) {
		if (err) {
			var fail = {
				"RESULT": "FAIL",
				"RESULT_MSG ": err
			}
			res.json(fail);
		}

		var before = doc.Q_REPORTER;

		var success = {
			"RESULT" : "SUCCESS",
			"RESULT_MSG" : "SUCCESS"
		};

		before.push(user_id);
		quesCollection.update({ _id: id }, { "$set": { Q_REPORTER: before } });
		res.json(success);

		//검사
	});
};

exports.reportComm = function (req, res) {
	var comm_id = req.params.comm_id;
	console.log('req.body : ', req.body);

	var user_id = req.body.user_id;
	var id = mongojs.ObjectId(comm_id);

	commCollection.findOne({ _id: id }, { COMM_REPORTER: 1 }, function (err, doc) {
		if (err) {
			var fail = {
				"RESULT": "FAIL",
				"RESULT_MSG ": err
			}
			res.json(fail);
		}
		var before = doc.COMM_REPORTER;

		before.push(user_id);
		console.log(before);
		commCollection.update({ _id: id }, { "$set": { COMM_REPORTER: before } }, function(err, result){
			if(err) res.sendStatus(500);
			var success = {
			"RESULT" : "SUCCESS",
			"RESULT_MSG" : "SUCCESS"
		};
		res.json(success);
		});


		//검사
	});
};
