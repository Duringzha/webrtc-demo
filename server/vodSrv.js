//vod Srv for icvp
var express = require('express')
const { normalize } = require('path')
var app = new express()

app.use(express.static(__dirname))
var http = require('http').createServer(app)



var vodPeers = require('./vodPeers')

app.get('/', (req, res) => {
    console.log(req)
    res.sendFile(__dirname + '/index.html');
});


var v = new vodPeers(require('socket.io')(http),{
    ingInterval: 100000000,
})

v.on('newProductor', (video) =>{

})
v.on('newCosumer', (cosumer) => {

})
v.on('peerOffline', (user) => {
    //需要特别当前正在进行的点播
})

v.on('startPlay', (playing) => {

})
v.on('stopPlay', (playing) => {
    

})

http.listen(8081)

