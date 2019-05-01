var mongojs = require('mongojs');
var extend = require('util-extend');
var async = require('async');
var formidable = require('formidable');
var fs = require('fs');
var fse = require('fs-extra');
var commrouter = require('./comm_router');
var logger = require('./logger');

var uploads = [];
var uploadDir = __dirname + '/files';

fse.emptyDirSync(uploadDir);
console.log('upload Dir : ' + uploadDir);

var db = mongojs('localhost:27017/hooztest');
var userCollection = db.collection('USER');
var quesCollection = db.collection('QUESTION');
var commCollection = db.collection('Q_COMMENT');
var Clist = [];

exports.showQdetail = function (req, res) { // show Question Detail
	Clist = []; //댓글 리스트 초기화
	var q_id = req.params.q_id;
	var id = mongojs.ObjectId(q_id);

	var user_id = req.query.user_id;
	var user_like = false;
	var user_vote = false;
	var useObj;

	async.waterfall([
		function (callback) {
			quesCollection.findOne({ _id: id }, function (err, doc) { // show Question
				if (err) {
					logger.error('error', '글 상세보기 에러 : ', err);
					var fail = {
						"RESULT ": "FAIL",
						"RESULT_MSG": "글을 불러올 수 없습니다."
					}
					console.log("err :", err);
					res.json(fail);
				}
				console.log(doc);
				callback(null, doc);
		})
		},
		function(doc, callback){
			var photo_count = {
				"PHOTO_COUNT": 1
			};
			if (doc.Q_PHOTO1 == null && doc.Q_PHOTO2 == null) {
				photo_count.PHOTO_COUNT = 0;
			} else if (doc.Q_PHOTO1 != null && doc.Q_PHOTO2 != null) {
				photo_count.PHOTO_COUNT = 2;
			}

			doc = extend(doc, photo_count);

			doc.Q_LIKER.some(function (data, index) {
				if (data === user_id) {
					user_like = true;
					return data === user_id;
				}
			});

			doc.Q_VOTER1.some(function (data, index) {
				if (data === user_id) {
					user_vote = true;
					return data === user_id;
				}
			});

			doc.Q_VOTER2.some(function (data, index) {
				if (data === user_id) {
					user_vote = true;
					return data === user_id;
				}
			});

			useObj = {
				USER_LIKE: user_like,
				USER_VOTE: user_vote
			}

			doc.Q_LIKER = doc.Q_LIKER.length;

			var vote1 = doc.Q_VOTER1.length;
			var vote2 = doc.Q_VOTER2.length;
			var totalvote = vote1 + vote2;
			if (totalvote == 0) {
				doc.Q_VOTER1 = 0;
				doc.Q_VOTER2 = 0;
			} else {
				doc.Q_VOTER1 = Math.round((vote1 / totalvote) * 100);
				doc.Q_VOTER2 = Math.round((vote2 / totalvote) * 100);
			}

			callback(null, doc);
		},
		function (doc, callback){
			var qt = doc.Q_DATETIME;
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

			doc.Q_DATETIME = outputTime;
			callback(null, doc);
			}
		], function(err, result){
			console.log("result : ", result);

				userCollection.findOne({ USER_ID: result.Q_WRITER }, { _id: 0 }, function (err, obj) {
				if (err) { logger.error('error', '글 상세보기 에러 : ', err); };
				var nowYear = new Date().getFullYear();
				if(obj == null){
					var fail = {
						"RESULT ": "FAIL",
						"RESULT_MSG": '글을 불러올 수 없습니다.'
					};
					res.end(JSON.stringify(fail));
				}else{


							obj.USER_AGE = nowYear - obj.USER_AGE + 1;
							result.Q_WRITER = obj;
							var Qobj = extend( result, useObj);

							showCommlist(Qobj, user_id, req, res);
				}
						});

		})
}

function showCommlist(Qobj, user_id, req, res) { //make a list of comment

	var q_id = Qobj._id;
	console.log(typeof q_id);
	var output1 = [
		{ $match: { Q_ID: q_id } },
		{ $project: { _id: 0, document: "$$ROOT", dateOfques: { $subtract: [new Date(), "$COMM_DATETIME"] } } },
		{ $sort: { dateOfques: 1 } },
		{ $limit: 10 },
		{ $skip: 0 }
	];
	commCollection.aggregate(output1, function(err, doc){
		if (err) { logger.error('error', '글 상세보기 댓글 리스트 에러 : ', err); res.sendStatus(500); }
		var Commlist;
		if (doc.length == 0) {
			Commlist = [];
		} else {
			Commlist = doc;
		}
		async.each(Commlist, function(dataaa, callback1){
				if (Commlist.length == 0) {
					callback1();
				}else{
					async.waterfall([
				function (callback) {
					var user_report = {
						"USER_REPORT": false
					};
					extend(data, user_report);
					data.COMM_REPORTER.some(function (data2, index) {
						if (data2 === user_id) {
							data.USER_REPORT = true;
							return data2 === user_id;
						}
					})
					callback(null, data);
				},
				function (data, callback) {

					var qt = data.Q_DATETIME;
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

					data.Q_DATETIME = outputTime;
					callback(null, data);
				},
				function (data, callback) {
					userCollection.findOne({ USER_ID: data.COMM_WRITER }, function (err, obj) {
						if (err) {logger.error('error', '글 상세보기 댓글 리스트 에러 : ', err);
						res.sendStatus(500);}
						if(obj == null){
							var fail = {
								"RESULT ": "FAIL",
								"RESULT_MSG": '글을 불러올 수 없습니다.'
							};
							res.end(JSON.stringify(fail));
						}
						var nowYear = new Date().getFullYear();
						obj.USER_AGE = nowYear - obj.USER_AGE + 1;
						data.COMM_WRITER = obj;
						callback(null, Commlist);
					});
				}
				],function (err, result) {
					if(err) {logger.error('error', '글 상세보기 댓글 리스트 에러 : ', err);
					res.sendStatus(500);
				}
					callback1();
				})
			}
		},
			function (err) {
					if (err){
						logger.error('error', '글 상세보기 댓글 리스트 에러 : ', err);
					res.sendStatus(500);
				}
					Qobj.Q_COMM = result.length;
					var size = 10;
					var totalcnt = parseInt(Commlist.length);
					var totalpage = Math.ceil(totalcnt / size);

					var Cobj = {
						"PAGE_NO": 1,
						"TOTAL_PAGE": totalpage,
						"Q_ID ": Qobj._id,
						"Q_COMMENT": Commlist
					}

					var success = {
						"RESULT": "SUCCESS",
						"QUESTION": Qobj,
						"COMM_LIST": Cobj
					}

					res.end(JSON.stringify(success));
				})
	})
}
