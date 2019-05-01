var mongojs = require('mongojs');

var db = mongojs('localhost:-');
var fbCollection = db.collection('FEEDBACK');
var userCollection = db.collection('USER');
var quesCollection = db.collection('QUESTION');
var commCollection = db.collection('Q_COMMENT');

exports.adminHome = function(req, res){
	res.render('adminHome');
}

exports.feedbackList = function (req, res){

	fbCollection.find({},function(err, docs){
		if(err) res.sendStatus(500);
		if(docs.length == 0){

		}
		res.render('feedbackList', { "docs" : docs} );
	})
}

exports.addInitDatafm = function(req, res){
	console.log('hello');
	res.render('addInitDataForm');
}
/*
exports.reportlist = function(req, res){
	//신고글만
	quesCollection.aggregate(
	[	{$match : { $gt : [{reportcnt : { $size : "$Q_REPORTER"}}, 0]}},
		{$project : {document : "$$ROOT", countOfReport : {$size : "$Q_REPORTER"}}},
		{$sort : {countOfReport : -1}} ]
	,function(err, docs){
		if(err) res.sendStatus(500);
		else{
			res.render('reportList', { "docs" : docs});
		}
	} )

}
*/
