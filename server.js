// Import the Express.js library
const express = require("express")

// Create an instance of the Express application
const app = express()

// Import the built-in HTTP module
const http = require("http")

// Serve static files from the "public" directory
app.use(express.static(__dirname + "/public"))

// Declare a variable to store the broadcaster's socket ID
let broadcaster

// Set the port for the server
const port = 4000

// Create an HTTP server using the Express application
const server = http.createServer(app)

// Initialize Socket.io and attach it to the server
const io = require("socket.io")(server)

// Listen for errors on the Socket.io connection
io.sockets.on("error", e => console.log(e))

// Listen for incoming socket connections
io.sockets.on("connection", socket => {
	// Listen for a "broadcaster" event from a client
	socket.on("broadcaster", () => {
		// Mark the current socket as the broadcaster
		broadcaster = socket.id
		console.log("broadcaster connected", broadcaster)
		// Notify all other connected clients that a broadcaster has joined
		socket.broadcast.emit("broadcaster")
	})

	// Listen for a "watcher" event from a client
	socket.on("watcher", () => {
		console.log("watcher", socket.id)
		// Send a "watcher" event to the broadcaster to indicate a new watcher has joined
		socket.to(broadcaster).emit("watcher", socket.id)
	})

	// Listen for an "offer" event from a client (viewer side)
	socket.on("offer", (id, message) => {
		console.log("offer", id)
		// Send the "offer" message to the specified viewer (client ID)
		socket.to(id).emit("offer", socket.id, message)
	})

	// Listen for an "answer" event from a client (broadcaster side)
	socket.on("answer", (id, message) => {
		console.log("answer", id)
		// Send the "answer" message to the specified viewer (client ID)
		socket.to(id).emit("answer", socket.id, message)
	})

	// Listen for a "candidate" event from a client (both broadcaster and viewer side)
	socket.on("candidate", (id, message) => {
		console.log("candidate", id)
		// Send the "candidate" message to the specified viewer (client ID)
		socket.to(id).emit("candidate", socket.id, message)
	})

	// Listen for a "disconnect" event when a client leaves
	socket.on("disconnect", () => {
		console.log("disconnect", socket.id)
		// Notify the broadcaster when a viewer disconnects
		socket.to(broadcaster).emit("disconnectPeer", socket.id)
	})
})

// Start the server and listen on the specified port
server.listen(port, () => console.log(`Server is running on port ${port}`))
