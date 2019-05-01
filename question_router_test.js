var mongojs = require('mongojs');
var AWS = require('aws-sdk');
var async = require('async');
var extend = require('util-extend');
var formidable = require('formidable');
var fs = require('fs');
var fse = require('fs-extra');
var pathUtil = require('path');
var easyimg = require('easyimage');

AWS.config.region = 'region';
AWS.config.accessKeyId = 'accessKeyId';
AWS.config.secretAccessKey = 'secretAccessKey';

var s3 = new AWS.S3();
console.log('endpoint', s3.endpoint.href);

var uploadDir = __dirname + '/files';
var thumbnailDir = __dirname + '/thumbnail';

// 이미지 파일 목록
var resources = [];

if ( ! ( fs.existsSync(uploadDir) && fs.existsSync(thumbnailDir) ) ) {
	console.error('upload, thumbnail 폴더 없음!');
	process.exit();
}

var db = mongojs('localhost:27017/hooztest');
var userCollection = db.collection('USER');
var quesCollection = db.collection('QUESTION');
var commCollection = db.collection('Q_COMMENT');

exports.newQuestion = function (req, res) {
	//req : q_togender, q_category, q_type, q_content, q_morecomm, q_photo1, q_photo2
//	var user_id = req.body.user_id;
	console.log("body : ",req.body);

	var form = new formidable.IncomingForm();
	form.encoding = 'utf-8';
	form.uploadDir = uploadDir;
	form.multiples = true;
	form.keepExtentions = true;

	console.log("form : ",form);
	form.parse(req, function (err, fields, files) {
		if (err) {
			console.error('Error', err);
			res.statusCode = 404;
			res.end();
		} else {
			var user_id = fields['user_id'];
			var togender = parseInt(fields['q_togender']);
			var category = parseInt(fields['q_category']);
			var qtype = parseInt(fields['q_type']);
			var content = fields['q_content'];
			var morecomm = (fields['q_morecomm'] === 'true');
			var now= new Date();
			var datetime = ''+ now.getFullYear() + (now.getMonth()+1) + now.getDate() +
         	now.getHours() + now.getMinutes() + now.getSeconds();

			var q_photo1 = files.q_photo1;
			var q_photo2 = files.q_photo2;

			async.series( seriesArray(q_photo1, q_photo2, user_id, datetime )
				, function (err, results) {
					if (err) {
						console.log('Error', err);
						res.sendStatus(500); //Internal Server Error!
					}
					else {
						var thumburl1, thumburl2;
						console.log("results : ",results);
						if(results[0] != null){thumburl1 = results[4];}
						else{thumburl1 = null;}
						if(results[1] != null){thumburl2 = results[5];}
						else{thumburl2 = null;}

						var url1 = results[2];
						var url2 = results[3];

						var insert_data = {
							"Q_WRITER": user_id,
							"Q_TOGENDER": togender,
							"Q_CATEGORY": category,
							"Q_TYPE": qtype,
							"Q_CONTENT": content,
							"Q_MORECOMM": morecomm,
							"Q_PHOTO1": url1,
							"Q_PHOTO2": url2,
							"Q_THUMBNAIL1" : thumburl1,
							"Q_THUMBNAIL2" : thumburl2,
							"Q_DATETIME": now,
							"Q_LIKER": [],
							"Q_COMM": [],
							"Q_VOTER1": [],
							"Q_VOTER2": [],
							"Q_HIDER": [],
							"Q_REPORTER": []
						}

						console.log('insert_data :', insert_data);

						quesCollection.save(
							insert_data, function (err, result) {
								if (err){
									var fail = {
										"RESULT ": "FAIL",
										"RESULT_MSG": err
									};
									res.end(JSON.stringify(fail)); }

								var success = {
										"RESURT": "SUCCESS",
										"RESULT_MSG": "SUCCESS",
										"Q_ID": result._id
									};
								res.end(JSON.stringify(success));
							});
					}
				});
		}
	})
}

function seriesArray(q_photo1, q_photo2,user_id, datetime ){
var itemKey1 = 'q1_' + user_id + '_'+ datetime +'.jpg';
var itemKey2 = 'q2_' + user_id + '_'+ datetime +'.jpg';
var bucketName = 'hoozbucket';
var thumbnail_width, thumbnail_height;
if((typeof q_photo1) == 'object' && (typeof q_photo2) == 'object'){// 사진 두개 업로드
	thumbnail_width = 288;
	thumbnail_height = 288;
}else{
	thumbnail_width = 512;
	thumbnail_height = 384;
}
var series = [
	//임시 파일에서 썸네일 생성
					function(callback){
						if(q_photo1 == 'null' || (typeof q_photo1) == 'object'){
						easyimg.thumbnail({
							src:q_photo1.path,
							dst: thumbnailDir + pathUtil.sep +'thumbnail1'+ q_photo1.name,
							width : thumbnail_width,
							height : thumbnail_height
						}).then(function(thumbimage1){
							console.log('thumbnail created: ', thumbimage1);
							callback(null, thumbimage1);
						}, function(err) {
							console.error('Thumbanil Create Error', err);
							callback(err, null);
						});
					}else{
						var thumbimage1 = null;
						callback(null, thumbimage1);
						}
					},
					//임시 파일에서 썸네일 생성
					function(callback){
						if(q_photo2 == 'null' || (typeof q_photo2) == 'object'){
						easyimg.thumbnail({
							src:q_photo2.path,
							dst: thumbnailDir + pathUtil.sep + 'thumbnail2'+ q_photo2.name ,
							width : thumbnail_width,
							height : thumbnail_height
						}).then(function(thumbimage2){
							console.log('thumbnail created: ', thumbimage2);
							callback(null, thumbimage2);
						}, function(err) {
							console.error('Thumbanil Create Error', err);
							callback(err, null);
						});
					}else{
						var thumbimage2 = null;
						callback(null, thumbimage2);
						}
					},
					function (callback) {

						if(q_photo1 == 'null' || (typeof q_photo1) == 'object'){
							var params1 = {
								Bucket : bucketName,
								Key : 'image/'+ itemKey1,
								ACL : 'public-read',
								ContentType : q_photo1.type,
								Body : fs.createReadStream(q_photo1.path)
							}

							s3.putObject(params1, function (err, data) {
							if (err) console.log(err)
							else {
								var url1 = s3.endpoint.href + bucketName + '/image/' + itemKey1;
								callback(null, url1);
							}
						});

						}else{ // ==undefined
							var url1 = null;
							callback(null, url1);
						}
					},
					function (callback) {
						if(q_photo2 == 'null' || (typeof q_photo2) == 'object'){
						var params2 = {
							Bucket: bucketName,
							Key: 'image/'+ itemKey2,
							ACL: 'public-read',
							ContentType: q_photo2.type,
							Body: fs.createReadStream(q_photo2.path)
						};
						s3.putObject(params2, function (err, data) {
							if (err) console.log(err)
							else {
								var url2 = s3.endpoint.href + bucketName + '/image/' + itemKey2;
								callback(null, url2);
							}
						});
					}else {
						var url2 = null;
						callback(null, url2);
						}
					},
					function(callback){
						//썸네일 키 생성
						if(q_photo1 == 'null' || (typeof q_photo1) == 'object'){

						var extname1 = pathUtil.extname(q_photo1.name);
						var newFileName1 = 'thum_q1_' + user_id + '_' + datetime;
						//var itemKey1 = 'q1_' + user_id + '_'+ datetime +'.jpg';
						var thumbnailKey = 'thumbnail/' + newFileName1 + extname1;
						var thumbanilBody = fs.createReadStream(thumbnailDir + pathUtil.sep +'thumbnail1'+  q_photo1.name);
		//				console.log('thumbanilBody : ', thumbanilBody);
						var thumbnailParams = {
						Bucket : bucketName,
						Key: thumbnailKey,
						ACL: 'public-read',
						Body: thumbanilBody,
						ContentType: q_photo1.type
					}
						// 썸네일 저장
					s3.putObject(thumbnailParams, function(err, data) {
						if ( err ) {
							console.error('Thumbnail Error', err);
							callback(err, null);
						}
						else {
							var thumburl1 = s3.endpoint.href + bucketName  + '/' + thumbnailKey;
							callback(null, thumburl1);
						}
					});
						}else{
							var thumburl1 = null;
							callback(null, thumburl1);
						}
					},
					function(callback){
						//썸네일 키 생성
						if(q_photo2 == 'null' || (typeof q_photo2) == 'object'){

						var extname2 = pathUtil.extname(q_photo2.name);
						var newFileName2 = 'thum_q2_' + user_id + '_'+datetime;

						var thumbnailKey = 'thumbnail/' + newFileName2 + extname2;
						var thumbanilBody = fs.createReadStream( thumbnailDir + pathUtil.sep +'thumbnail2'+ q_photo2.name);
						var thumbnailParams = {
						Bucket : bucketName,
						Key: thumbnailKey,
						ACL: 'public-read',
						Body: thumbanilBody,
						ContentType: q_photo2.type
					}
						// 썸네일 저장
					s3.putObject(thumbnailParams, function(err, data) {
						if ( err ) {
							console.error('Thumbnail Error', err);
							callback(err, null);
						}
						else {
							var thumburl2 = s3.endpoint.href + bucketName  + '/' + thumbnailKey;
							callback(null, thumburl2);
						}
					});
						}else{
							var thumburl2 = null;
							callback(null, thumburl2);
						}
					},
					function (callback) {
						// 임시 파일 삭제
						if(q_photo1 == 'null' || (typeof q_photo1) == 'object'){
							fs.unlinkSync(q_photo1.path);
							fs.unlinkSync(thumbnailDir + pathUtil.sep +'thumbnail1'+  q_photo1.name);
						}
						if(q_photo2 == 'null' || (typeof q_photo2) == 'object'){
							fs.unlinkSync(q_photo2.path);
							fs.unlinkSync(thumbnailDir + pathUtil.sep +'thumbnail2'+ q_photo2.name);
						}
						callback(null, null);
					}
];
return series;
}

exports.updateQuestion = function (req, res){
	//req : user_id, q_id, q_content, q_photo1, q_photo2, q_morecomm
	var q_id = req.params.q_id;
	var id = mongojs.ObjectId(q_id);

	var form = new formidable.IncomingForm();
	form.encoding = 'utf-8';
	form.uploadDir = uploadDir;
	form.multiples = true;
	form.keepExtentions = true;

	form.parse(req, function (err, fields, files) {
		if(err){
			console.error('Error', err);
			res.statusCode = 404;
			res.end('');
		}else{

			var user_id = fields['user_id'];
			var content = fields['q_content'];
			var morecomm = (fields['q_morecomm'] === 'ture');

			var q_photo1 = files.q_photo1;
			var q_photo2 = files.q_photo2;

	async.waterfall([
				function(callback) {
					var datetime;
			//사진이 안바뀌었을때(내용만 바뀌엇을때_)
			quesCollection.findOne({_id : id},{ Q_DATETIME : 1}, function(err, doc){
				var qdatetime = doc.Q_DATETIME;
				datetime = ''+ qdatetime.getFullYear() + (qdatetime.getMonth()+1) + qdatetime.getDate() +
         		qdatetime.getHours() + qdatetime.getMinutes() + qdatetime.getSeconds();
				callback(null, datetime);
			});
		}
		],function(err, results){
			//사진이 바뀌거나 추가했을 경우
			async.series(seriesArray(q_photo1, q_photo2, user_id,results)
				,function (err, results) {
					if (err) {
						console.log('Error', err);
						res.sendStatus(500); //Internal Server Error!
					}
					else{
						var thumburl1, thumburl2;
						if(results[0] != null){thumburl1 = results[0].path;}
						else{thumburl1 = null;}
						if(results[1] != null){thumburl2 = results[1].path;}
						else{thumburl2 = null;}

						var url1 = results[2];
						var url2 = results[3];

						var update_data = {
							"Q_CONTENT": content,
							"Q_MORECOMM": morecomm,
							"Q_PHOTO1": url1,
							"Q_PHOTO2": url2,
							"Q_THUMBNAIL1" : thumburl1,
							"Q_THUMBNAIL2" : thumburl2,
						}

						quesCollection.update( { _id : id }, { "$set" : update_data }, function(err, result){
							if(err) {console.log('update error: ',err); res.sendStatus(500);}

							var success = {
								"RESURT": "SUCCESS",
								"RESULT_MSG": "SUCCESS",
								"Q_ID": id
									};
						res.json(success);
						});
					}
				});
			})
		}
	})
}

exports.deleteQuestion = function (req, res){
	var q_id = req.params.q_id;
	var id = mongojs.ObjectId(q_id);
	var page_no = req.body.page_no;
	var category = req.body.q_category;

	quesCollection.findOne({_id : id}, { Q_COMM : 1, Q_PHOTO1 : 1, Q_PHOTO2 : 1, Q_THUMBNAIL1 : 1, Q_THUMBNAIL2 : 1 },
		function(err, result){
		if(err) res.sendStatus(500);
		console.log(result);
		var commArray = result.Q_COMM;
		async.parallel( [
			function(callback){
				//댓글 삭제
				if(commArray.length == 0){
					callback(null, null);
				}else {
				commArray.forEach(function (data, index){
					var id = mongojs.ObjectId(data);
					commCollection.remove({_id: id}, function(err, result){
						if (err) res.sendStatus(500);
						console.log('function1 result :',result);
						if(commArray.length == (index +1)) callback(null, null);
					});
					});
				}
			},
			function(callback){
				//s3 사진, 썸네일
				callback(null, null);
			}
			], function(err, result){
				// 글
				quesCollection.remove({_id : id}, function(err, result){
					if(err) res.sendStatus(500);
					var success = {
						"RESULT" : "SUCCESS",
						"RESULT_MSG" : "SUCCESS",
						"PAGE_NO" : page_no,
						"Q_CATEGORY" : category
					}
					res.json(success);
				})
			})
	 })
}
