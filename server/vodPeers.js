//socket msg process 



class user {
    #type = null
    
    // emit(...args) {
    //     if(this.socket)
    //         this.socket.emit(args)
    // }
    constructor(socket, id) {
        this.socket = socket
        this.id = id

        socket.on('icecandidate', (ice) => {
            if(ice.owner == id){
                let user = vodPeers.getUser(ice.peer);
                user && user.socket.emit('icecandidate', {peer:ice.peer, owner:ice.owner, candidate:ice.candidate, id: id})
            }
        });
        socket.on('re_icecandidate', (ice) => {
            if(ice.owner == id){
                let user = vodPeers.getUser(ice.peer);
                user && user.socket.emit('re_icecandidate', {peer:ice.peer, owner:ice.owner, candidate:ice.candidate, id: id})
            }
        });
        socket.on('hangup', (peer) => { //不存在重复连接
            let user = vodPeers.getUser(peer) //订阅目标
            user && user.socket.emit('hangup', id);
        });
        socket.on('refuseInvitation',(peer) => {
            let user = vodPeers.getUser(peer) //拒绝进入聊天室
            user && user.socket.emit('refuseInvitation', id);
        })
    }
    type() {
        return this.#type
    }
    
}

class productor extends user {
    #type = 'productor'
    #viewers = []

    constructor(socket, id) {
        super(socket, id)

        socket.on('answer', (answer) => {
            let consumer = vodPeers.getConsumer(answer.peer)
            consumer.socket.emit('answer', {callee: answer.owner, sdp:answer.sdp, id: id});
        });

        socket.on("call", (offer) => {
            console.log('call_consumer');
            let consumer = vodPeers.getConsumer(offer.callee) //订阅目标
            consumer.socket.emit('offer',  {caller:id, owner:offer.callee, sdp:offer.sdp})
        });

    }
}
class consumer extends user {
    #type = 'consumer'

    constructor(socket, id) {
        super(socket, id);

        socket.on('answer', (answer) => {
            let productor = vodPeers.getProductor(answer.peer) //订阅目标
            productor.socket.emit('answer',  {callee: answer.owner, sdp:answer.sdp, id: id})
        });

        socket.on('call', (offer) => {
            console.log('call_productor');
            let productor = vodPeers.getProductor(offer.callee) //订阅目标
            productor.socket.emit('offer',  {caller:id, video:id, sdp:offer.sdp})
        })

    }
}

class vodPeers extends require('events'){
    events = ['newProductor',
        'newConsumer',
        'peerOffline',
        'startPlay',
        'stopPlay'
    ]
    //将会触发如下多种消息
    //1、新的生产者上线（信号源注册）
    //2、新的消费者上线（用户）
    //3、订阅事件（点播）
    //4、取消订阅（停止）

    static _connectors = {}
    static _productors = {}
    static _consumers = {}

    constructor(io) {
        
        super();
        io.on('connection', (socket) => {
            console.log('new connection')
            this.addPeer(socket)
            socket.on('disconnect', () => {
                console.log('disconnect')
                this.removePeer(socket)
            })
        })

    }

    removePeer(socket) {
        if (socket.id) {
            this.emit('peerOffline', socket.id)

            if (socket instanceof (productor))
                delete _prouctors[socket.id]
            else if (socket instanceof (consumer))
                delete _consumers[socket.id]
            else
                ;//exception
        }

        socket.disconnect();
        socket = null;
    }
    addPeer(socket) {
        socket.on('chatInvitation', (info) => {
            socket.broadcast.emit('chatInvitationEvent', info);
        });
        socket.on('startMediaChat', () => {
            socket.emit('chatRoomCreateSuccess');
            socket.broadcast.emit('chatRoomCreateSuccess');
        });
        socket.on('declare', (peer) => {
            if(typeof peer == 'string'){
                peer = JSON.parse(peer);
            }
        
            if (peer.type == 'productor') {
                //'new video'
                vodPeers._productors[peer.id] = new productor(socket, peer.id);
                //this.emit('newProductor', id)
                socket.broadcast.emit('newProductor', peer)

            }
            else if (peer.type == 'consumer') {
                //new monitor
                vodPeers._consumers[peer.id] = new consumer(socket, peer.id);
                socket.broadcast.emit('newConsumer', peer)
            }
        })
    }
    static getUser(id) {
        return vodPeers.getProductor(id)  || vodPeers.getConsumer(id)
    }
    static getProductor (id) {
        return vodPeers._productors[id];
    }
    static getConsumer(id) {
        return vodPeers._consumers[id];
    }
}

module.exports = vodPeers;