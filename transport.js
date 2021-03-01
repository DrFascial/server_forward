const Kind = {
  Req: 0,
  Res: 1
}

module.exports = class Transport {
  constructor(socket) {
    this.uid = 0
    this.listener = {}
    this.reader = null
    this.handler = null
    this.socket = socket
    this.raw = Buffer.alloc(0)
    socket.on("data", buf => {
      this._write(buf)
    })
  }
  
  _body(req) {
    return new Promise((resolve, reject) => {
      let buf = Buffer.alloc(0)
      req.on("data", chunk => {
        buf = Buffer.concat([
          buf, 
          chunk
        ])
      })

      req.on("error", reject)
      req.on("end", () => {
        resolve(buf.toString())
      })
    })
  }

  _encoder(data, id, kind) {
    let buf = Buffer.alloc(12)
    buf.writeInt32BE(kind, 0)
    buf.writeInt32BE(id, 4)
    buf.writeInt32BE(data.length, 8)
    this.reader(Buffer.concat([
      buf,
      data
    ]))
  }
  
  call(req) {
    return new Promise(async resolve => {
      this.listener[this.uid] = resolve
      this._encoder(Buffer.from(JSON.stringify({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: await this._body(req)
      })), this.uid, Kind.Req)
      if (this.uid > 99999) {
        this.uid = 0
      }
    })
  }
  
  on(handler) {
    this.handler = handler
  }
  
  _write(chunk) {
    this.raw = Buffer.concat([
      this.raw,
      chunk
    ])
    
    for(;;) {
      if (12 > this.raw.length) {
        break
      }
      
      const kind = this.raw.readUInt32BE(0)
      const id = this.raw.readUInt32BE(4)
      const size = this.raw.readUInt32BE(8)
      if (12 + size > this.raw.length) {
        break
      }
      
      const body = this.raw.subarray(12, 12 + size)
      this.raw = this.raw.subarray(12 + size)
      if (kind === Kind.Res) {
        this.listener[id](body)
      } else {
        this.handler(
          JSON.parse(body.toString()),
          buf => this._encoder(buf, id, Kind.Res)
        )
      }
    }
  }
}