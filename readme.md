### 安装:

```
npm install --save redux-smart-cache
```

### 使用
#### 1.配置持久化的实现，以及缓存的时间
例如：在react-native app里，我们可以这样做


```js
import { cacheConfig } from 'redux-smart-cache'
import { AsyncStorage } from 'react-native'
// 实现了缓存的存储，返回Promise，result是void
cacheConfig.save = async function(key, value){
  const data = JSON.stringify(value)
  await AsyncStorage.setItem(key, data)
}
// 实现缓存的读取，返回Pormise，result是一个json对象
cacheConfig.load = async function(key){
  const value =  await AsyncStorage.getItem(key)
  return JSON.parse(value)
}
// 设置userinfo这个state的缓存时间为1小时
cacheConfig.cacheDueTime = {
  userinfo: 3600 * 1000
}
// 设置默认的缓存时间为200秒
cacheConfig.defaultDueTime = 200 * 1000

```
#### 2. Action
```js
function loadUserinfo(userId) {
  return {
    // 配置尝试，成功，失败三种type
    types: [
      'USERINFO_LOAD_ATTEMPT',
      'USERINFO_LOAD_SUCCESS',
      'USERINFO_LOAD_FAILURE'
    ],
    // 实现callAPI接口，是个promise接口
    callAPI: async () => {
      const res = await fetch(`http://example.com/users/${userId}`)
      return {
        userinfo: res.body.userinfo,  
        //结果是否有效，该属性为true，则使用cache，否则不做任何处理
        effective: res.body.errorNo == 0
      }
    },
    // 第一个type的action载体
    payload: {key, value, attempting: true},
    // 是否强制更新，如果为false，则使用cache
    forceUpdate: false
  }
}  
```
#### 3.配置reducer, combineReducer, 及使用中间件
```js
import {cacheMiddleWare} from 'react-smart-cache'
function userinfoReducer(state = {attempting: false}, action) {
  switch (action.type) {
  case 'USERINFO_LOAD_ATTEMPT':
    return state.merge({ attempting: true })
  case 'USERINFO_LOAD_SUCCESS':
    return state.merge({ attempting: false, errorCode: null, userinfo: action.userinfo})
  case 'USERINFO_LOAD_FAILURE':
    return state.merge({ attempting: false, errorCode: action.errorCode })
  default:
    return state
  }
}
const rootReducer = combineReducers({
  userinfo: userinfoReducer
})
const enhancers = compose(
  applyMiddleware(cacheMiddleWare)
)

const store = createStore(
  rootReducer, 
  enhancers
)

```

### 依赖
redux

es-2015

es6