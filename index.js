function getChangedStateKey(oldState, newState){
  let changedStateKey = null;
  for (let key in oldState) {
      if (newState[key] !== oldState[key]) {
        changedStateKey = key
        break
      }
  }
  return changedStateKey
}
export const cacheConfig = {
  save: (key, value) => {
    console.log('need implement save async, key: string, value: object, return: void')
  },
  load: (key) => {
    console.log('need implement load async, key: string, return: object')
    return null
  },
  cacheDueTime: {
    // stateKey: 1000 * 600
  },
  defaultDueTime: 20 * 1000
}
function getCacheDueTime(key) {
  const dueTime = cacheConfig.cacheDueTime[key]
  return dueTime > 0 ? dueTime : defaultDueTime
}
export function cacheMiddleWare({ dispatch, getState }){
  return (next) => (action) => {
    const {
      types,
      callAPI,
      payload = {},
      forceUpdate = false
    } = action
    if (!types) {
      // Normal action: pass it on
      const result =  next(action)
      return result
    }
    if (
      !Array.isArray(types) ||
      types.length !== 3 ||
      !types.every(type => typeof type === 'string')
    ) {
      throw new Error('Expected an array of three string types.');
    }

    if (typeof callAPI !== 'function') {
      throw new Error('Expected callAPI to be a function.')
    }

    const [requestType, successType, failureType] = types

    // 这个时候只是检查该action对应的state是不是有缓存
    // action
    const newAction = Object.assign({}, payload, {
      type: requestType
    })
    const oldState = getState()
    dispatch(newAction)
    const newState = getState()
    const changedStateKey = getChangedStateKey(oldState, newState)
    // 发布第一个action出去

    if (forceUpdate || !changedStateKey) {
      // 强制更新
      return callAPI().then(
        response => {
          const data = {...response, lastFetch: (new Date()).getTime()}
          return dispatch(Object.assign({}, payload, {
            ...data,
            attempting: false,
            type: successType
          }))
        },
        error => dispatch(Object.assign({}, payload, {
          attempting: false,
          type: failureType,
          error
        }))
      ).catch(error => dispatch(Object.assign({}, payload, {
          attempting: false,
          type: failureType,
          error
      })))  
    } else {
        cacheConfig.load(changedStateKey).then(result => {
          // 取缓存里的内容
          const data = result
          data.fromCache = true
          const now = (new Date()).getTime()

          if (result && (now - data.lastFetch) < getCacheDueTime(changedStateKey)) {
            if (__DEV__)
              console.log('从缓存里取', data)
            // 如果有内容，且内容没有失效
            return dispatch(Object.assign({}, payload, {
              ...data,
              attempting: false,
              type: successType
            }))
          } else {
            // 调用api
            if (__DEV__)
              console.log('调用api')
            return callAPI()
          }
        }, error => {
          if (__DEV__)
            console.log('error', error)
          // 缓存出错也调用api
          return callAPI()
        }).then(
          response => {
            const data = {...response, lastFetch: (new Date()).getTime()}
            if (!data.fromCache && data.effective) {
              if (__DEV__)
                console.log('数据是从接口获取，并且数据有效存入缓存')
              cacheConfig.save(changedStateKey, data)
              return dispatch(Object.assign({}, payload, {
                ...data,
                attempting: false,
                type: successType
              }))
            }
          },
          error => dispatch(Object.assign({}, payload, {
            error,
            attempting: false,
            type: failureType
          }))
        ).catch(error => error => dispatch(Object.assign({}, payload, {
            error,
            attempting: false,
            type: failureType
        })))  
    }
  }
}
