var mongojs = require('mongojs');
var db = mongojs('localhost:-');
var fbCollection = db.collection('FEEDBACK');
var logger = require('./logger');
exports.addFeedback = function (req, res){
//req : f_content, f_email
	var f_content = req.body.f_content;
	var f_email = req.body.f_email;
	console.log(req.body);
	fbCollection.insert( { F_CONTENT : f_content, F_EMAIL : f_email, F_DATETIME : new Date()}, function(err, result){
		if(err){
			console.log('error: ',err);
			logger.error('error', '?�견 보내��??�록 ?�러 : ', err);
			var fail = {
				"RESULT" :"FAIL",
				"RESULT_MSG" : err
				};
				res.end(JSON.stringify(fail));
		}
		console.log('success');
		var success = {
			"RESULT" : "SUCCESS",
			"RESULT_MSG" : "SUCCESS"
		}
		res.json(success);
	});
};
