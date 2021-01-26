<template>
    <div class="main">
        <el-button type="primary" @click="_sendChatInvitation" v-if='!userType'>开始</el-button>
        <el-button type="warning" @click="_endChatting" v-if="userType">结束</el-button>
        <el-button type="primary" @click="_camareCtrl" v-if="userType" plain>{{camare == 'on' ? '关闭摄像头' : '开启摄像头'}}</el-button>
        <el-button type="primary" @click="_audioCtrl" v-if="userType" plain>{{audio == 'on' ? '关闭麦克风' : '开启麦克风'}}</el-button>
        <div class="video-wrap">

            <div class="remoteVideoBox">
                <video class="remoteVideo" id="remoteVideo" playsinline autoplay/>
                <i class="cameraIcon el-icon-video-camera"></i>
                <i class="audioIcon el-icon-microphone"></i>
            </div>

            <div class="localVideoBox">
                <video class="localVideo" id="localVideo" playsinline autoplay muted />
                <i class="cameraIcon el-icon-video-camera" :class="camare == 'on' ? 'active' : ''"></i>
                <i class="audioIcon el-icon-microphone" :class="audio == 'on' ? 'active' : ''"></i>
            </div>
        </div>
    </div>
</template>
<script>
export default {
    data(){
        return{
            user_id: "",
            camare: "on",
            audio: "on",
            connector_id: null,
            offer: null,
            peerConnection: null,
            userType: ""
        }
    },
    mounted(){
        const _this = this;
        //初始化聊天室
        _this.$nextTick(function(){
            _this._renderChatRoom();
        })
    },
    sockets: {
        connect(){
            console.log("socket connect");
            // this.$socket.emit('declare', {id: this.user_id});
        },
        chatInvitationEvent(inviteInfo){
            const _this = this;
            console.log(inviteInfo);
            if(inviteInfo.user_id != _this.user_id){
                _this.$confirm('用户：'+ inviteInfo.user_id + '发起了视频聊天邀请，是否参加？', '提示', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                }).then(() => {
                    //参加视频聊天
                    _this.userType = "consumer";
                    _this.$socket.emit("startMediaChat");
                }).catch(() => {
                    //拒绝视频聊天  
                    _this.userType = "";
                    _this.$socket.emit("refuseInvitation", _this.connector_id);        
                });
            }
        },
        refuseInvitation(){
            this.$message('对方已拒绝邀请，视频聊天结束');
        },
        chatRoomCreateSuccess(){
            this.$message('对方已接受邀请，视频聊天开始');
            this.$socket.emit('declare', {id: this.user_id, type: this.userType});
        },
        newProductor(connector){
            const _this = this;
            console.log("getRemoteConnector", connector);
            console.log("getRemoteConnector", _this.userType);
            if (_this.userType == 'productor'){
                return;
            }
            _this.connector_id = connector.id;
            _this.peerConnection = new RTCPeerConnection(_this.configuration, _this.pcOptions);
            _this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && _this.connector_id){
                    _this.$socket.emit('icecandidate', {
                        peer: _this.connector_id,
                        owner: _this.user_id,
                        candidate: event.candidate
                    })
                }
            };
            _this.peerConnection.ontrack = (event) => {
                console.log(0);
                _this._setRemoteVideo(event);
            }
            console.log("getRemoteConnector createOffer");
            _this.peerConnection.createOffer({ 
                offerToReceiveVideo: 1, 
                offerToReceiveAudio: 0 
            }).then(offer => {
                _this.offer = offer;
                console.log("call_productor", _this.connector_id);
                _this.$socket.emit('call_productor', {callee:_this.connector_id, sdp:offer});
            });
        },

        newConsumer(connector){
            const _this = this;
            console.log(connector);
            if (_this.userType == 'consumer'){
                return;
            }
            _this.connector_id = connector.id;
            _this.peerConnection = new RTCPeerConnection(_this.configuration, _this.pcOptions);
            _this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && _this.connector_id){
                    _this.$socket.emit('icecandidate', {
                        peer: _this.connector_id,
                        owner: _this.user_id,
                        candidate: event.candidate
                    })
                }
            };
            _this.peerConnection.ontrack = (event) => {
                console.log(0);
                _this._setRemoteVideo(event);
            }
            console.log("getRemoteConnector createOffer");
            _this.peerConnection.createOffer({ 
                offerToReceiveVideo: 1, 
                offerToReceiveAudio: 0 
            }).then(offer => {
                _this.offer = offer;
                console.log('call_consumer', _this.connector_id);
                _this.$socket.emit('call_consumer', {callee:_this.connector_id, sdp:offer});
            });
        },

        answer(remoteAnswer){
            const _this = this;
            _this.peerConnection.setLocalDescription(_this.offer); //delay set local,避免过早触发 onicacandidate`
            if (_this.connector_id != remoteAnswer.callee){return;} //不是自己订阅的目标，should be exception
            let rtcSession = new RTCSessionDescription(remoteAnswer.sdp);
            _this.peerConnection.setRemoteDescription(rtcSession).then(() => {
                console.log("get remote media success");
            }).catch(e => {
                console.log("setRemoteDescription error", e);
            });
            console.log('answer')
            //_this.$socket.emit("re_call", {callee:_this.connector_id, sdp:_this.offer});
        },
        re_answer(remoteAnswer){
            const _this = this;
            _this.peerConnection.setLocalDescription(_this.offer); //delay set local,避免过早触发 onicacandidate`
            if (_this.connector_id != remoteAnswer.callee){return;} //不是自己订阅的目标，should be exception
            let rtcSession = new RTCSessionDescription(remoteAnswer.sdp);
            _this.peerConnection.setRemoteDescription(rtcSession).then(() => {
                console.log("get remote media success");
            }).catch(e => {
                console.log("setRemoteDescription error", e);
            });
            console.log('re_answer')
            //_this.$socket.emit("re_call", {callee:_this.connector_id, sdp:_this.offer});
        },
        icecandidate(ice){
            const _this = this;
            _this.connector_id = ice.owner;
            console.log(_this.connector_id);
            try {
                console.info('addIceCandidate ', ice.candidate)
                _this.peerConnection.addIceCandidate(ice.candidate).then(() => {

                }).catch(e => console.error(e));
            } catch (e) {
                console.log(e)
            }
        },
        hangup(){
            console.log("scne 对方已退出视频聊天")
            this.$message('对方已退出视频聊天');
            this.userType = "";
            this.peerConnection.close();
            this.re_peerConnection.close();
            this.peerConnection = null;
            this.re_peerConnection = null;
            this.$socket.emit('disconnect', 1);
            for(let track of this.local_stream.getTracks()){
                track.stop();
            }
        },
        offer_productor(remoteOffer){
            const _this = this;
            _this.connector_id = remoteOffer.caller;
            _this.re_peerConnection = new RTCPeerConnection(_this.configuration,_this.pcOptions);
            _this.re_peerConnection.onicecandidate = event => {
                if (event.candidate && _this.connector_id){
                    _this.$socket.emit('icecandidate', {
                        peer:_this.connector_id, 
                        owner:_this.user_id, 
                        candidate:event.candidate
                    })
                }
            }
            _this.re_peerConnection.onIceStateChange = (pc, event) => {
                if (pc) {
                    console.log(` ICE state: ${pc.iceConnectionState}`);
                    console.log('ICE state change event: ', event);
                }
            }
            console.log("正在启动摄像头");
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
            }).then((stream) => {
                _this.local_stream = stream;
                let videoTracks = _this.local_stream.getVideoTracks();
                let localVideo = document.getElementById("localVideo");
                localVideo.srcObject = stream;
                console.log(`Using video device: ${videoTracks[0].label}`);
                for (const track of stream.getTracks()) {
                    _this.re_peerConnection.addTrack(track);
                }
                console.info('setRemoteDescription ', remoteOffer);
                _this.re_peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer.sdp));
                _this.re_peerConnection.createAnswer({ offerToReceiveAudio: 0, offerToReceiveVideo: 1 }).then(answer => {
                    _this.re_peerConnection.setLocalDescription(answer).then(() => {

                        _this.$socket.emit('answer', {peer:remoteOffer.caller, owner:_this.user_id, sdp:answer})
                    });
                });
            });
        },
        offer_consumer(remoteOffer){
            const _this = this;
            _this.connector_id = remoteOffer.caller;
            _this.re_peerConnection = new RTCPeerConnection(_this.configuration,_this.pcOptions);
            _this.re_peerConnection.onicecandidate = event => {
                if (event.candidate && _this.connector_id){
                    _this.$socket.emit('icecandidate', {
                        peer:_this.connector_id, 
                        owner:_this.user_id, 
                        candidate:event.candidate
                    })
                }
            }
            _this.re_peerConnection.onIceStateChange = (pc, event) => {
                if (pc) {
                    console.log(` ICE state: ${pc.iceConnectionState}`);
                    console.log('ICE state change event: ', event);
                }
            }
            console.log("正在启动摄像头");
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
            }).then((stream) => {
                _this.local_stream = stream;
                let videoTracks = _this.local_stream.getVideoTracks();
                let localVideo = document.getElementById("localVideo");
                localVideo.srcObject = stream;
                console.log(`Using video device: ${videoTracks[0].label}`);
                for (const track of stream.getTracks()) {
                    console.log("getTrack")
                    _this.re_peerConnection.addTrack(track);
                }
                console.info('setRemoteDescription ', remoteOffer);
                _this.re_peerConnection.setRemoteDescription(new RTCSessionDescription(remoteOffer.sdp));
                _this.re_peerConnection.createAnswer({ offerToReceiveAudio: 0, offerToReceiveVideo: 1 }).then(answer => {
                    _this.re_peerConnection.setLocalDescription(answer).then(() => {
                        _this.$socket.emit('re_answer', {peer:remoteOffer.caller, owner:_this.user_id, sdp:answer})
                    });
                });
            });
        },
    },
    methods: {
        _renderChatRoom(){
            const _this = this;
            _this.user_id = this._getGuid();
            //参数配置
            _this.pcOptions = {
                optional: [{
                    DtlsSrtpKeyAgreement: true
                }]
            };
            _this.configuration = {
                mandatory: {
                    OfferToReceiveAudio: true,
                    OfferToReceiveVideo: true
                }
            };
            //建立socket连接
            _this.$socket.emit('connect', 1);
        },
        //发起视频聊天
        _sendChatInvitation: function(){
            const _this = this;
            //发送聊天请求
            _this.userType = "productor";
            _this.$socket.emit('chatInvitation', {user_id: _this.user_id, type: _this.userType});
        },
        //结束视频聊天
        _endChatting: function(){
            const _this = this;
            _this.$confirm('是否退出视频聊天？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }).then(() => {
                _this.userType = "";
                _this.peerConnection.close();
                _this.re_peerConnection.close();
                _this.peerConnection = null;
                _this.re_peerConnection = null;
                _this.$socket.emit('hangup', _this.connector_id);
                console.log("scne hangup");
                _this.$socket.emit('disconnect', 1);

                for(let track of _this.local_stream.getTracks()){
                    track.stop();
                }

            })
        },
        //摄像头控制
        _camareCtrl(){
            const _this = this;
            let videoTracks = _this.local_stream.getVideoTracks();
            if(_this.camare == "on"){
                _this.camare = "off";
                videoTracks[0].enabled = false;
            }else{
                _this.camare = "on";
                console.log(videoTracks);
                videoTracks[0].enabled = true;
            }
        },
        //麦克风控制
        _audioCtrl(){
            const _this = this;
            let videoTracks = _this.local_stream.getVideoTracks();
            if(_this.audio == "on"){
                _this.audio = "off";
                videoTracks[0].muted = true;
            }else{
                _this.audio = "on";
                videoTracks[0].muted = false;
            }
        },
        _setRemoteVideo(ev){
            let localVideo = document.getElementById("remoteVideo");
            let remote_stream = "";
            if (ev.streams && ev.streams[0]) {
                remote_stream = ev.streams[0];
            } else {
                if (!remote_stream){
                    remote_stream = new MediaStream();
                }
                remote_stream.addTrack(ev.track);
            }
            localVideo.srcObject = remote_stream;
        },
        //guid生成
        _getGuid: function(){
            let guid = "";
            for (let i = 1; i <= 32; i++){
                let n = Math.floor(Math.random()*16.0).toString(16);
                guid +=   n;
                if((i==8)||(i==12)||(i==16)||(i==20))
                    guid += "-";
            }
            return guid;
        }
    }
}
</script>
<style lang="less" scoped>
    .main{
        width: 100%;
        height: 100%;
        .video-wrap{
            width: 100%;
            position: relative;
            .remoteVideoBox{
                position: absolute;
                width: 600px;
                height: 430px;
                margin: 10px 0;
                background: black;
                left: 0;
                top: 0;
                z-index: 0;
                .remoteVideo{
                    width: 100%;
                    height: 100%;
                }
            }
            .localVideoBox{
                width: 200px;
                height: 120px;
                background: yellow;
                position: absolute;
                left: 395px;
                top: 15px;
                .localVideo{
                    width: 100%;
                    height: 100%;
                }
            }
            .localVideoBox,.remoteVideoBox{
                video{
                    object-fit: fill;
                }
                i{
                    position: absolute;
                    top: 0;
                    font-size: 1em;
                    color: #796d6d;
                    padding: .4em;
                    &.active{
                        color: red;
                    }
                    &.cameraIcon{
                        left: 0;
                    }
                    &.audioIcon{
                        left: 1.5em;
                    }
                }
            }
        }
    }
</style>