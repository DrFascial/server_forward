const Transport = require("./transport")
const config = require("./config.json")
const http = require("http")
const net = require("net")

net.createServer(socket => {
  const transport = new Transport(socket)
  http.createServer(async (req, res) => {
    res.end(await transport.call(req))
  }).listen(config.public)
}).listen(config.forward.port)