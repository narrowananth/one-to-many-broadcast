// Declare a variable to hold the peer connection
let peerConnection

// Configuration for ICE (Interactive Connectivity Establishment) servers
const config = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302"
		}
	]
}

// Connect to a WebSocket server using the 'io' library (assuming it's imported elsewhere)
const socket = io.connect(window.location.origin)

// Get a reference to the video element in the HTML
const video = document.querySelector("video")

// Get references to "enable audio" and "disable audio" buttons in the HTML
const enableAudioButton = document.querySelector("#enable-audio")
const disableAudioButton = document.querySelector("#disable-audio")

// Add event listeners for the "enable audio" and "disable audio" buttons
enableAudioButton.addEventListener("click", enableAudio)
disableAudioButton.addEventListener("click", disableAudio)

// Listen for an "offer" event from the WebSocket server
socket.on("offer", (id, description) => {
	// Create a new RTCPeerConnection with the specified configuration
	peerConnection = new RTCPeerConnection(config)

	// Set the remote description received from the offer
	peerConnection
		.setRemoteDescription(description)
		.then(() => peerConnection.createAnswer()) // Create an answer to the offer
		.then(sdp => peerConnection.setLocalDescription(sdp)) // Set the local description with the answer
		.then(() => {
			// Send the answer to the server
			socket.emit("answer", id, peerConnection.localDescription)
		})

	// Set up an event handler for when a track (audio or video) is received
	peerConnection.ontrack = event => {
		video.srcObject = event.streams[0] // Display the received stream in the video element
	}

	// Set up an event handler for ICE candidate generation
	peerConnection.onicecandidate = event => {
		if (event.candidate) {
			// Send the ICE candidate to the server for forwarding to another peer
			socket.emit("candidate", id, event.candidate)
		}
	}
})

// Listen for a "candidate" event from the WebSocket server
socket.on("candidate", (id, candidate) => {
	// Add the received ICE candidate to the peer connection
	peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e))
})

// When the WebSocket connection is established, emit a "watcher" event to indicate the client is ready to watch
socket.on("connect", () => {
	socket.emit("watcher")
})

// When the server signals that this client is a broadcaster, emit a "watcher" event
socket.on("broadcaster", () => {
	socket.emit("watcher")
})

// Define event handlers for when the window is unloaded or beforeunload
window.onunload = window.onbeforeunload = () => {
	socket.close() // Close the WebSocket connection
	peerConnection.close() // Close the peer connection
}

// Function to enable audio (unmute)
function enableAudio() {
	console.log("Enabling audio")
	video.muted = false // Set the video element's muted property to false
}

// Function to disable audio (mute)
function disableAudio() {
	console.log("Disabling audio")
	video.muted = true // Set the video element's muted property to true
}
