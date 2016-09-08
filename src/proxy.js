export default function getProxy (client) {
  function getMethodProxy (service) {
    const methodProxy = new Proxy({}, {
      get: function (target, name) {
        return function (data, callback) {
          return client.call(service, name, data, callback)
        }
      }
    })
    return methodProxy
  }

  const serviceProxy = new Proxy({}, {
    get: function (target, name) {
      return getMethodProxy(name)
    }
  })

  return serviceProxy
}
