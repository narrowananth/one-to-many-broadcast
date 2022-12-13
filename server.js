const express = require("express")
const app = express()
const http = require("http")
app.use(express.static(__dirname + "/public"))

let broadcaster
const port = 4000

const server = http.createServer(app)
const io = require("socket.io")(server)

io.sockets.on("error", e => console.log(e))

io.sockets.on("connection", socket => {
	socket.on("broadcaster", () => {
		//broadcaster side
		broadcaster = socket.id
		console.log("broadcaster connected", broadcaster)
		socket.broadcast.emit("broadcaster")
	})
	socket.on("watcher", () => {
		//viewer side
		console.log("watcher", socket.id)
		socket.to(broadcaster).emit("watcher", socket.id)
	})
	socket.on("offer", (id, message) => {
		//viewer side
		console.log("offer", id)
		socket.to(id).emit("offer", socket.id, message)
	})
	socket.on("answer", (id, message) => {
		//broadcaster side
		console.log("answer", id)
		socket.to(id).emit("answer", socket.id, message)
	})
	socket.on("candidate", (id, message) => {
		//broadcaster side & viewer side
		console.log("candidate", id)
		socket.to(id).emit("candidate", socket.id, message)
	})
	socket.on("disconnect", () => {
		//broadcaster side & viewer side
		console.log("disconnect", socket.id)
		socket.to(broadcaster).emit("disconnectPeer", socket.id)
	})
})
server.listen(port, () => console.log(`Server is running on port ${port}`))
