var express = require('express');
var userrouter = require('./user_router');
var qListrouter = require('./qlist_router');
var qDetailrouter = require('./qDetail_router');
var qrouter = require('./question_router');
var dorouter = require('./do_router');
var commrouter = require('./comm_router');
var approuter = require('./app_router');
var webrouter = require('./web_router');
var bodyParser = require('body-parser');
var logger = require('./logger');

var app = express();

//view engine setup
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.use(function(req,res,next){
	console.log(req.url, req.method);
	next();
})

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.post('/user', userrouter.newUser); //회원 정보 입력(앱 첫실행시)
app.get('/user',userrouter.showUserInfo); // 회원 정보 요청(개인정보화면)
app.post('/user/update', userrouter.updateUserInfo); //회원 정보 수정
app.post('/user/delete', userrouter.deleteUser); // 회원 탈퇴

app.get('/qlist', qListrouter.showQlist);//카테고리별 글 리스트
app.get('/user/writing/:q_or_comm', qListrouter.showWritingList); //작성글 리스트
app.get('/qlist/search', qListrouter.searchQlist); //검색한 글 리스트

app.get('/commlist/:q_id', commrouter.showCommlist); // 댓글 리스트
app.get('/question/:q_id', qDetailrouter.showQdetail);// 글 상세보기
app.post('/question',qrouter.newQuestion); // 글 등록
app.post('/question/:q_id/update', qrouter.updateQuestion); // 글 수정
app.post('/question/:q_id/delete', qrouter.deleteQuestion); // 글 삭제

app.post('/question/:q_id/like', dorouter.likeQorNot ); //좋아요
app.post('/question/:q_id/hide', dorouter.hideQorNot ); //글 감추기
app.post('/question/:q_id/vote', dorouter.voteOXAB); //투표 응답
app.post('/question/:q_id/report', dorouter.reportQ); //글 신고

app.post('/ques/comm/:comm_id/report', dorouter.reportComm); //댓글 신고


app.post('/ques/comm', commrouter.newComment); //댓글 등록
app.post('/ques/comm/:comm_id/update', commrouter.updateComm); // 댓글 수정
app.post('/ques/comm/:comm_id/delete',commrouter.deleteComm); //댓글 삭제

app.post('/app/feedback', approuter.addFeedback); //피드백

app.get('/admin', webrouter.adminHome); //관리자페이지 홈
app.get('/admin/feedbackList', webrouter.feedbackList); // admin_feedback
//app.get('/admin/addInitDataform', webrouter.addInitDatafm); //초기데이터 입력 폼
// app.get('/admin/reportList',webrouter.reportlist); //신고 관리 페이지

app.use(function(req,res){
	res.end('Hello, HOOZ!');
});

app.listen(3010);