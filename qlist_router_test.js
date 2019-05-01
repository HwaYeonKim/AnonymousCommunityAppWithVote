var mongojs = require('mongojs');
var async = require('async');
var extend = require('util-extend');

var db = mongojs('localhost:-');
var userCollection = db.collection('USER');
var quesCollection = db.collection('QUESTION');
var commCollection = db.collection('Q_COMMENT');

exports.showQlist = function (req, res) {
	var q = req.query;
	var category = parseInt(q.input_category);
	var togender = parseInt(q.input_togender);
	var page = parseInt(q.page_no);
	var user_id = q.user_id;

	var user_do = {
		"USER_LIKE": false,
		"USER_VOTE": false,
		"USER_HIDE": false,
		"USER_REPORT": false
	}
	var skipcnt = (page - 1) * 10;
	if (category == 1) {
        var str1 = { Q_TOGENDER: togender };
		var output1 = [{ $match: str1 },
			{ $project: { _id: 0, document: "$$ROOT" , dateOfques : { $subtract : [new Date(),"$Q_DATETIME" ]}} },
			{ $sort: { dateOfques : 1 } },
			{ $limit: skipcnt + 10 },
			{ $skip: skipcnt }
		];
		showQlistFun(user_id,togender, user_do, str1, output1, page, res);
	} else if (category == 2) {
		//best
		var str2 = {};
		var output2 = [{ $match: str2 },
			{ $project: { _id: 0, document: "$$ROOT", countOfLiker: { $size: "$Q_LIKER" } } },
			{ $sort: { countOfLiker: -1 } },
			{ $limit: skipcnt + 10 },
			{ $skip: skipcnt }
		];
		showQlistFun(user_id,togender, user_do, str2, output2, page, res);
	} else if (category > 2 && category < 8) {
		var str = { Q_TOGENDER: togender, Q_CATEGORY: category };
		var output = [{ $match: str },
			{ $project: { _id: 0, document: "$$ROOT" , dateOfques : { $subtract : [new Date(),"$Q_DATETIME" ]}} },
			{ $sort: { dateOfques : 1 } },
			{ $limit: skipcnt + 10 },
			{ $skip: skipcnt }
		];
		showQlistFun(user_id,togender, user_do, str, output, page, res);
	} else {
		var fail = {
			"RESULT ": "FAIL",
			"RESULT_MSG": 'error'
		};
		res.end(JSON.stringify(fail));
	}
}

function showQlistFun(user_id,togender, user_do, str, aggreObj, page, res) {
	quesCollection.aggregate(
		aggreObj, function(err, doc){
			if (err) res.sendStatus(500);
			if (doc.length == 0) {
				var fail = {
					"RESULT ": "FAIL",
					"RESULT_MSG": '글을 불러올 수 없습니다.'
				};
				res.end(JSON.stringify(fail));
			}
			async.each(doc, function(dataaa, callback1){
				var data = dataaa.document;
				async.waterfall([
								function (callback){
									var photo_count = {
										"PHOTO_COUNT" : 1
									} ;
									if(data.Q_PHOTO1 == null && data.Q_PHOTO2 == null){
										photo_count.PHOTO_COUNT =0;
									}else if(data.Q_PHOTO1 != null && data.Q_PHOTO2 != null){
										photo_count.PHOTO_COUNT = 2;
									}

									data = extend(data,photo_count );
									callback(null, data);
								},
									function(data, callback){
										userCollection.findOne({"USER_ID" : user_id},{ _id:0 }, function(err, obj){
											if(err) res.sendStatus(500);
											if(obj == null){
												var fail = {
													"RESULT" : "FAIL",
													"RESULT_MSG" : '존재하지 않는 사용자입니다.'
												};
												res.json(fail);
											}else{
												if(obj.USER_GENDER != ""+togender){
													user_do.USER_VOTE = true;
													callback(null, data);
												}else{
													callback(null, data);
												}
											}
										})
									},
								function (data, callback) {
									data.Q_LIKER.some(function (data2, index) {
										if (data2 === user_id) {
											user_do.USER_LIKE = true;
											return data2 === user_id;
										}
									});

									data.Q_VOTER1.some(function (data2, index) {
										if (data2 === user_id) {
											user_do.USER_VOTE = true;
											return data2 === user_id;
										}
									});

									data.Q_VOTER2.some(function (data2, index) {
										if (data2 === user_id) {
											user_do.USER_VOTE = true;
											return data2 === user_id;
										}
									});

									data.Q_HIDER.some(function (data2, index) {
										if (data2 === user_id) {
											user_do.USER_HIDE = true;
											return data2 === user_id;
										}
									});

									data.Q_REPORTER.some(function (data2, index) {
										if (data2 === user_id) {
											user_do.USER_REPORT = true;
											return data2 === user_id;
										}
									});

									data.Q_LIKER = data.Q_LIKER.length;
									var vote1 = data.Q_VOTER1.length;
									var vote2 = data.Q_VOTER2.length;
									var totalvote = vote1 + vote2;
									if (totalvote == 0) {
										data.Q_VOTER1 = 0;
										data.Q_VOTER2 = 0;
									} else {
										data.Q_VOTER1 = Math.round((vote1 / totalvote) * 100);
										data.Q_VOTER2 = Math.round((vote2 / totalvote) * 100);
									}

									data.Q_HIDER = data.Q_HIDER.length;
									data.Q_REPORTER = data.Q_REPORTER.length;
									data.Q_COMM = data.Q_COMM.length;

									data = extend(data, user_do);

									callback(null, data);
								},
								function (data, callback) {
									var year = data.Q_DATETIME.getFullYear();
									var month = data.Q_DATETIME.getMonth();
									var day = data.Q_DATETIME.getDate();
									var hour = data.Q_DATETIME.getHours();
									var minute = data.Q_DATETIME.getMinutes();
									var second = data.Q_DATETIME.getSeconds();
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
										outputTime = ''+ weeks +'주전';
									} else if (days > 0) {
										outputTime = '' + days +'일전';
									} else if (hours > 0) {
										outputTime = '' + hours +'시간전';
									} else if (minutes > 0) {
										outputTime = '' + minutes +'분전';
									} else {
										outputTime = '방금전';
									}

									data.Q_DATETIME = outputTime;
									callback(null, data);
								}
								],
								function (err, result) {
									userCollection.findOne({ USER_ID: result.Q_WRITER }, { _id: 0 }, function (err, obj) {
										if (err) res.sendStatus(500);
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
										callback1();
									}
									});
								})
							},
							 function (err) {
							 		var size = 10;
							 		var totalcnt = parseInt(doc.length);
							 		var totalpage = Math.ceil(totalcnt / size);
							 		var success = {
							 			"RESULT": "SUCCESS",
							 			"QLIST": {
							 				"PAGE": page,
							 				"TOTALPAGES": totalpage,
							 				"QUESTION": doc
							 			}
							 		}
							 			res.end(JSON.stringify(success));
					}
			);
	});
}

exports.showWritingList = function (req, res) {
	var q_or_comm = req.params.q_or_comm;
	console.log('q_or_comm : ', q_or_comm);
	var qcomm = parseInt(q_or_comm);
	var user_id = req.query.user_id;
	console.log(user_id);
	if (qcomm == 1) { //작성글 리스트
			quesCollection.aggregate([
				{ $match: { Q_WRITER: user_id } },
				{ $project: { _id: 1, Q_CONTENT: 1, Q_COMM: 1, Q_CATEGORY: 1, Q_DATETIME: 1 , dateOfques : { $subtract : [new Date(),"$Q_DATETIME" ]}}},
				{ $sort: { dateOfques: 1 } }], function (err, doc) {
					if (err) res.sendStatus(500);
					if (doc.length == 0) {
						var fail = {
							"RESULT ": "FAIL",
							"RESULT_MSG": '글이 없습니다.'
						};
						res.end(JSON.stringify(fail));
					}
					async.each(doc, function(data, callback1){
						async.waterfall([
									function (callback) {
											data.Q_COMM = data.Q_COMM.length;
											callback(null, data);
										},
										function (data, callback) {
											var year = data.Q_DATETIME.getFullYear();
											var month = data.Q_DATETIME.getMonth();
											var day = data.Q_DATETIME.getDate();
											var hour = data.Q_DATETIME.getHours();
											var minute = data.Q_DATETIME.getMinutes();
											var second = data.Q_DATETIME.getSeconds();
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
										}
										],
							function (err, result) {
								if (err) res.sendStatus(err);
								callback1();
							})
							},// async.each function 괄호
							function (err) {
								var success = {
									"RESULT": "SUCCESS",
									"QLIST": doc
								}
								res.end(JSON.stringify(success));
							})
				})

	} else if (qcomm == 2) { //작성 댓글 리스트
		commCollection.aggregate([
			{ $match: { COMM_WRITER: user_id } },
			{ $project: { _id: 1, COMM_CONTENT: 1, Q_ID: 1, COMM_DATETIME: 1 , dateOfques : { $subtract : [new Date(),"$COMM_DATETIME" ]}} },
			{ $sort: { dateOfques: 1 } }], function (err, doc) {
				if (err) res.sendStatus(500);
				if (doc.length == 0) {
					var fail = {
						"RESULT ": "FAIL",
						"RESULT_MSG": '글이 없습니다.'
					};
					res.end(JSON.stringify(fail));
				}
				async.each(doc, function(data, callback1){
					async.waterfall([
							function (callback) {
								var ct = data.COMM_DATETIME;
								var year = ct.getFullYear();
								var month = ct.getMonth();
								var day = ct.getDate();
								var hour = ct.getHours();
								var minute = ct.getMinutes();
								var second = ct.getSeconds();
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
								console.log('data : ',data);
								callback(null, data);
							},
							function (data, callback) {
								var q_id = data.Q_ID;
								quesCollection.findOne({ _id: q_id },
									{ Q_CATEGORY: 1, Q_COMM: 1, _id: 0 }, function (err, doc) {
										console.log('doc : ', doc);
										doc.Q_COMM = doc.Q_COMM.length;
										data = extend(data, doc);
										console.log(data);
										callback(null, data);
									})
							}
						],function (err, result) {
								if (err) res.sendStatus(err);
								callback1();
							})
				},function (err) {
								var success = {
									"RESULT": "SUCCESS",
									"QLIST": doc
								}
								res.end(JSON.stringify(success));
							})
				})
				}
				 else {
		var fail = {
			"RESULT": "FAIL",
			"RESULT_MSG": "FAIL"
		}
		res.json(fail);
	}
}

exports.searchQlist = function (req, res) {
	console.log('query', req.query);
	var word = req.query.search_word;
	var category = parseInt(req.query.search_category); //null, 3,4,5,6,7
	console.log(req.query.search_category);
	var page_no = req.query.page_no;
	var skipcnt = (page_no - 1) * 20;
	var user_id = req.query.user_id;
	var user_do = {
		"USER_HIDE": false,
		"USER_REPORT": false
	}
	var str2;
	if (isNaN(category)) {
		str2 = { Q_CONTENT: { $regex: word } }
	} else {
		str2 = { Q_CONTENT: { $regex: word }, Q_CATEGORY: category }
	}
	var str = { Q_TOGENDER: 1, Q_CATEGORY: 1, Q_CONTENT: 1, Q_COMM: 1, Q_HIDER: 1,
		Q_REPORTER: 1, Q_DATETIME : 1, dateOfques : { $subtract : [new Date(),"$Q_DATETIME" ]} };
	var output1 = [
	{ $match: str2 },
	{ $project: str },
	{ $sort: { dateOfques : 1 } },
	{ $limit: skipcnt + 10 },
	{ $skip: skipcnt }
	];

	quesCollection.aggregate(output1, function(err,doc){
		console.log(doc);
		if (doc.length == 0) {
			var fail = {
				"RESULT ": "FAIL",
				"RESULT_MSG": '검색결과가 없습니다.'
			};
			res.end(JSON.stringify(fail));
		}
		async.each(doc, function(data, callback1){
				async.waterfall([
						function (callback) {
							data.Q_HIDER.some(function (data2, index) {
								if (data2 == user_id) {
									user_do.USER_HIDE = true;
									return data2 === user_id;
								}
							});

							data.Q_REPORTER.some(function (data2, index) {
								if (data2 == user_id) {
									user_do.USER_REPORT = true;
									return data2 === user_id;
								}
							});
							callback(null, data);
						},function (data, callback) {
									var year = data.Q_DATETIME.getFullYear();
									var month = data.Q_DATETIME.getMonth();
									var day = data.Q_DATETIME.getDate();
									var hour = data.Q_DATETIME.getHours();
									var minute = data.Q_DATETIME.getMinutes();
									var second = data.Q_DATETIME.getSeconds();
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
										outputTime = ''+ weeks +'주전';
									} else if (days > 0) {
										outputTime = '' + days +'일전';
									} else if (hours > 0) {
										outputTime = '' + hours +'시간전';
									} else if (minutes > 0) {
										outputTime = '' + minutes +'분전';
									} else {
										outputTime = '방금전';
									}

									data.Q_DATETIME = outputTime;
									callback(null, data);
								},
						function (data, callback) {
							data.Q_COMM = data.Q_COMM.length;
							extend(data, user_do);
							callback(null, data);
						}
					],function (err, result){
						if(err) res.sendStatus(err);
						callback1();
					})
			},
			function (err) {
				var size = 20;
				var totalcnt = parseInt(doc.length);
				var totalpage = Math.ceil(totalcnt / size);
				var success = {
					"RESULT": "SUCCESS",
					"QLIST": {
						"PAGE": page_no,
						"TOTALPAGES": totalpage,
						"QLIST": doc
					}
				}
				res.json(success);
			})
	})
}
