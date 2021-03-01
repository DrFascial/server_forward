const Transport = require("./transport")
const config = require("./config.json")
const http = require("http")
const net = require("net")

const transport = new Transport(
  net.connect(config.forward)
)

transport.on((req, callback) => {
  const reqer = http.request({
    port: config.private,
    url: req.url,
    method: req.method,
    headers: req.headers,
  }, res => {
    let buf = Buffer.alloc(0)
    res.on("data", chunk => {
      buf = Buffer.concat([
        buf,
        chunk
      ])
    })
    
    res.on("end", () => {
      callback(buf)
    })
  })
  
  reqer.write(req.body)
  reqer.end()
})