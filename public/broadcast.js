// Create an empty object to store peer connections
const peerConnections = {}

// Define configuration for ICE (Interactive Connectivity Establishment) servers
const config = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302"
		}
	]
}

// Connect to a WebSocket server using the 'io' library (assuming it's imported elsewhere)
const socket = io.connect(window.location.origin)

// Listen for an "answer" event from the WebSocket server
socket.on("answer", (id, description) => {
	// Set the remote description for a specific peer connection based on the received answer
	peerConnections[id].setRemoteDescription(description)
})

// Listen for a "watcher" event from the WebSocket server
socket.on("watcher", id => {
	// Create a new RTCPeerConnection for a watcher (client)
	const peerConnection = new RTCPeerConnection(config)
	// Store the peer connection in the peerConnections object
	peerConnections[id] = peerConnection

	// Get the video stream from the HTML video element
	let stream = videoElement.srcObject
	// Add the tracks from the stream to the peer connection
	stream.getTracks().forEach(track => peerConnection.addTrack(track, stream))

	// Define an event handler for ICE candidate generation
	peerConnection.onicecandidate = event => {
		if (event.candidate) {
			// Send the ICE candidate to the server for forwarding to another peer
			socket.emit("candidate", id, event.candidate)
		}
	}

	// Create an offer to establish a connection
	peerConnection
		.createOffer()
		.then(sdp => peerConnection.setLocalDescription(sdp))
		.then(() => {
			// Send the offer to the server for forwarding to another peer
			socket.emit("offer", id, peerConnection.localDescription)
		})
})

// Listen for a "candidate" event from the WebSocket server
socket.on("candidate", (id, candidate) => {
	// Add the received ICE candidate to the corresponding peer connection
	peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate))
})

// Listen for a "disconnectPeer" event from the WebSocket server
socket.on("disconnectPeer", id => {
	// Close the corresponding peer connection and remove it from the object
	peerConnections[id].close()
	delete peerConnections[id]
})

// Define event handlers for when the window is unloaded or beforeunload
window.onunload = window.onbeforeunload = () => {
	// Close the WebSocket connection when the window is closed
	socket.close()
}

// Get references to HTML elements for video, audio source selection
const videoElement = document.querySelector("video")
const audioSelect = document.querySelector("select#audioSource")
const videoSelect = document.querySelector("select#videoSource")

// Define event handlers for audio and video source selection changes
audioSelect.onchange = getStream
videoSelect.onchange = getStream

// Function to handle the enumeration of available media devices
function gotDevices(deviceInfos) {
	window.deviceInfos = deviceInfos
	for (const deviceInfo of deviceInfos) {
		const option = document.createElement("option")
		option.value = deviceInfo.deviceId
		if (deviceInfo.kind === "audioinput") {
			option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`
			audioSelect.appendChild(option)
		} else if (deviceInfo.kind === "videoinput") {
			option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`
			videoSelect.appendChild(option)
		}
	}
}

// Function to get the user's media stream based on selected audio and video sources
function getStream() {
	if (window.stream) {
		window.stream.getTracks().forEach(track => {
			track.stop()
		})
	}
	const audioSource = audioSelect.value
	const videoSource = videoSelect.value
	const constraints = {
		audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
		video: { deviceId: videoSource ? { exact: videoSource } : undefined }
	}
	// Request and handle the user's media stream
	return navigator.mediaDevices.getUserMedia(constraints).then(gotStream).catch(handleError)
}

// Function to handle the obtained media stream
function gotStream(stream) {
	window.stream = stream
	audioSelect.selectedIndex = [...audioSelect.options].findIndex(
		option => option.text === stream.getAudioTracks()[0].label
	)
	videoSelect.selectedIndex = [...videoSelect.options].findIndex(
		option => option.text === stream.getVideoTracks()[0].label
	)
	videoElement.srcObject = stream
	// Emit a "broadcaster" signal to the server to indicate that this client is broadcasting
	socket.emit("broadcaster")
}

// Function to enumerate available media devices
function getDevices() {
	return navigator.mediaDevices.enumerateDevices()
}

// Function to handle errors
function handleError(error) {
	console.error("Error: ", error)
}

// Initialize the process by getting the user's media stream, enumerating devices, and displaying them
getStream().then(getDevices).then(gotDevices)
