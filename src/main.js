import Vue from 'vue'
import App from './App.vue'

import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

import VueSocketIO from 'vue-socket.io';

Vue.use(ElementUI); 

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
  beforeCreate(){
    //webrtc websocket连接
    Vue.use(new VueSocketIO({
      connection: 'https://www.hakulamatata.cn:8081',
    }));
  }
}).$mount('#app')
