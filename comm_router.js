var mongojs = require('mongojs');
var async = require('async');
var extend = require('util-extend');
var logger = require('./logger');

var db = mongojs('localhost:-');
var userCollection = db.collection('USER');
var quesCollection = db.collection('QUESTION');
var commCollection = db.collection('Q_COMMENT');

exports.showCommlist = function (req, res){
	var q_id = req.params.q_id;
	var user_id = req.query.user_id;
	var id = mongojs.ObjectId(q_id);

	var output1 = [
	{ $match: {Q_ID : id} },
	{ $project: { _id: 0, document: "$$ROOT" , dateOfques : { $subtract : [new Date(),"$COMM_DATETIME" ]}} },
	{ $sort: { dateOfques : 1 } }
	];

	commCollection.aggregate(output1, function(err, doc){
		if(err){
				logger.error('error', '댓글 리스트 요청 에러 : ', err);
			 res.sendStatus(500);
		}
		 var Commlist;
		if(doc.length == 0){
			Commlist = [];
			var fail = {
			"RESULT" : "FAIL",
			"RESULT_MSG" : "댓글이 없습니다."
			}
			res.json(fail);
		}else{
		Commlist = doc;
		}

		async.each(Commlist, function(dataaa, callback1){
			var data = dataaa.document;
			if(Commlist.length == 0){
				callback1();
			}else{
				async.waterfall([
					function (callback){
						var user_report = {
							"USER_REPORT":false
						};
						extend(data, user_report);
						data.COMM_REPORTER.some(function (data2, index){
							if(data2 === user_id){
								data.USER_REPORT = true;
								return data2 === user_id;
							}
						})
						callback(null, data);
					},
					function(data, callback){
						var qt = data.COMM_DATETIME;
						var year = qt.getFullYear();
						var month = qt.getMonth();
						var day = qt.getDate();
						var hour = qt.getHours();
						var minute = qt.getMinutes();
						var second = qt.getSeconds();
						var dt = new Date(year, month, day, hour, minute, second, 0);
						var now = new Date();

						var msecPerMinute = 1000 * 60;
						var msecPerHour = msecPerMinute * 60;
						var msecPerDay = msecPerHour * 24;
						var msecPerWeek = msecPerDay * 7;

						var interval = now.getTime() - dt.getTime();
						var minutes = Math.floor(interval / msecPerMinute);
						var hours = Math.floor(interval / msecPerHour);
						var days = Math.floor(interval / msecPerDay);
						var weeks = Math.floor(interval / msecPerWeek);

						var outputTime;
						if (weeks > 0) {
							outputTime = weeks + '주전';
						} else if (days > 0) {
							outputTime = days + '일전';
						} else if (hours > 0) {
							outputTime = hours + '시간전';
						} else if (minutes > 0) {
							outputTime = minutes + '분전';
						} else {
							outputTime = '방금전';
						}

						data.COMM_DATETIME = outputTime;
						callback(null, data);
					},
					function( data, callback ){
							userCollection.findOne({USER_ID : data.COMM_WRITER}, function(err, obj){
								if(err) {
									logger.error('error', '댓글 리스트에서 유저 불러오기 에러 : ', err);
									res.sendStatus(500);}
								var nowYear = new Date().getFullYear();
								if(obj == null){
									var fail = {
										"RESULT ": "FAIL",
										"RESULT_MSG": '댓글을 불러올 수 없습니다.'
									};
									res.end(JSON.stringify(fail));
								}else{
								obj.USER_AGE = nowYear-obj.USER_AGE+1;
								data.COMM_WRITER = obj;
								callback(null, data);
								}
							});
						}
					],function(err, result){
					if(err) {logger.error('error', '댓글 리스트 요청 에러 : ', err); res.sendStatus(500);}
					callback1();
				})
			}//else끝
		},function (err, result){
		if(err){
			logger.error('error', '댓글 리스트 마지막 에러 : ', err);
			res.sendStatus(500);}
		var size = 10;
//		var totalcnt = parseInt(.length);
//		var totalpage = Math.ceil(totalcnt / size);
		var success = {
			"RESULT" : "SUCCESS",
			"QLIST" : {
				"PAGE" : "1",
				"TOTALPAGES" : "1",
				"Q_ID" : q_id,
				"COMMENT" : Commlist
			}
		}
		res.end(JSON.stringify(success));
	});
})
}

exports.newComment = function(req, res){
	console.log("req.body :",req.body);

	var user_id = req.body.user_id;
	var q_id = mongojs.ObjectId(req.body.q_id);
	var comm_content = req.body.comm_content;

	var insert_data = {
		Q_ID : q_id,
		COMM_WRITER : user_id,
		COMM_DATETIME : new Date(),
		COMM_CONTENT : comm_content,
		COMM_REPORTER : []
	}
	commCollection.insert(
				insert_data, function (err, result) {
					if (err){
						logger.error('error', '댓글 디비에 등록 에러 : ', err);
						var fail = {
							"RESULT ": "FAIL",
							"RESULT_MSG": err
						};
						res.end(JSON.stringify(fail)); }
					console.log('result', result);


					quesCollection.findOne({_id : q_id}, {Q_COMM : 1}, function (err, doc){
						if (err) {
							logger.error('error', '댓글 등록 에러 : ', err);
							var fail = {
								"RESULT": "FAIL",
								"RESULT_MSG ": err
								}
							res.json(fail);
						}

						var comm = doc.Q_COMM;
						comm.push(result._id);
						quesCollection.update({_id: q_id}, {"$set": { Q_COMM: comm } }, function(err, result){
							if(err){
								logger.error('error', '댓글 디비에 등록 에러 : ', err);
								res.sendStatus(500);
							}else{
								var commcnt = comm.length;
								var success = {
									"RESULT": "SUCCESS",
									"RESULT_MSG": "SUCCESS",
									"Q_ID": result._id,
									"Q_COMM": commcnt
								};

								res.end(JSON.stringify(success));
							}
						});

						// var success = {
						// 	"RESULT": "SUCCESS",
						// 	"RESULT_MSG": "SUCCESS",
						// 	"Q_ID": result._id
						// };

						// res.end(JSON.stringify(success));
					})
				})
}

exports.updateComm = function (req, res){
	var comm_id = req.params.comm_id;

	var id = mongojs.ObjectId(comm_id);
	var comm_content = req.body.comm_content;
	var q_id = mongojs.ObjectId(req.body.q_id);
	commCollection.update({ _id : id}, { "$set": { COMM_CONTENT : comm_content }}, function(err, result){
		if(err) {console.log('update error: ',err); res.sendStatus(500);}

		console.log(result);
		 var success = {
		"RESULT" : "SUCCESS",
		"RESULT_MSG" : "SUCCESS",
		"Q_ID" : q_id
	}
	res.json(success);

	});

}

exports.deleteComm = function (req, res){
	var comm_id = req.params.comm_id;
	var c_id = mongojs.ObjectId(comm_id);
	var q_id = mongojs.ObjectId(req.body.q_id);

	quesCollection.findOne({ _id : q_id}, { Q_COMM : 1}, function(err, result){
		console.log(result);
		if(err){
			logger.error('error', '댓글 삭제 에러: ', err);
			res.sendStatus(500);
		}
		if(result == null){
			console.log("result null");
		}else{

		var commArray = result.Q_COMM;
		console.log('commArray :', commArray);
		async.parallel([
			function(callback){
				if(commArray.length == 0){
					callback(null, null);
				}else{
					console.log('commArray :', commArray);
					commArray.some(function (data, index){
						console.log('data : ', data);
						console.log('comm_id : ', comm_id);
						if(data == comm_id){
							console.log('data : ', data);
							commArray.splice(index, 1);
							quesCollection.update({ _id : q_id}, {"$set" : {Q_COMM : commArray}}, function(err, result){
								if(err){
									logger.error('error', '댓글 삭제 에러: ', err);
									res.sendStatus(500);
								}
								callback(null, null);
							});
							return data === c_id;
						}
					})
				}
			}],
			function(err, result){
				console.log('result :' ,result);
				commCollection.remove({ _id : c_id}, function(err, result){
					if(err) {console.log('delete error: ',err); res.sendStatus(500);}

					console.log(result);
					 var success = {
					"RESULT" : "SUCCESS",
					"RESULT_MSG" : "SUCCESS",
					"Q_ID" : q_id
				}
				res.json(success);
				});
			})
		}
	})
}
