// LiveClassPage.jsx (replace your existing file)
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './indec.css';

import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CallEndIcon from '@mui/icons-material/CallEnd';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import PanToolAltIcon from '@mui/icons-material/PanToolAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import { useSelector } from 'react-redux';

const configuration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// Small helper component to render remote student video and correctly set srcObject
const StudentVideo = ({ stream }) => {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream || null;
      // If there's no audio on stream (e.g. screen-share-only), muting helps autoplay in some browsers.
      ref.current.muted = !!(stream && stream.getAudioTracks && stream.getAudioTracks().length === 0);
      ref.current.play().catch(() => {});
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="student-video" />;
};

const LiveClassPage = () => {
  const { courseId } = useParams();
  const { user } = useSelector(state => state.auth);
  const { token } = useSelector(state => state.auth);
  const isTeacher = user?.role === 'teacher';

  const ws = useRef(null);

  // States
  const [joined, setJoined] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // {userId: stream}
  const [peerConnections, setPeerConnections] = useState({}); // {userId: pc}
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(isTeacher);
  const [screenSharing, setScreenSharing] = useState(false);
  const [teacherScreenSharing, setTeacherScreenSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [meetingTime, setMeetingTime] = useState('00:00:00');
  const [participants, setParticipants] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emoji, setEmoji] = useState('');
  const [handRaised, setHandRaised] = useState(false);

  // Refs
  const localVideoRef = useRef();
  const mainVideoRef = useRef();
  const screenShareVideoRef = useRef();
  const meetingTimer = useRef();

  // Preview before joining
  useEffect(() => {
    if (!joined) {
      initializePreview();
    }
    return () => {
      if (localStream) localStream.getTracks().forEach(track => track.stop());
      if (screenStream) screenStream.getTracks().forEach(track => track.stop());
      if (meetingTimer.current) clearInterval(meetingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  // Handle screen share video updates (local teacher view)
  useEffect(() => {
    if (screenSharing && screenStream && screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = screenStream;
      screenShareVideoRef.current.muted = true;
      screenShareVideoRef.current.play().catch(() => {});
    }
  }, [screenSharing, screenStream]);

  // initializePreview & initializeMeetingMedia
  const initializePreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      if (!isTeacher) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setAudioEnabled(false);
        }
      }
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const initializeMeetingMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      if (!isTeacher) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setAudioEnabled(false);
        }
      }
      startMeetingTimer();
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  // ---------------- WebSocket Setup ----------------
  const connectWebSocket = () => {
    // Use courseId (not hardcoded)
    const wsUrl = `ws://192.168.0.20:8000/ws/class/${encodeURIComponent(7)}/?token=Bearer%20${encodeURIComponent(token)}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("✅ WebSocket connected");
      ws.current.send(JSON.stringify({ type: "join", userId: user?.id, user: user?.name || "Guest" }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 WS Message:", data);

      switch (data.type) {
        case "signaling":
          handleSignaling(data.data, data.sender);
          break;
        case "chat":
          setMessages(prev => [...prev, { sender: data.sender, message: data.message, timestamp: new Date().toLocaleTimeString() }]);
          break;
        case "participants":
          setParticipants(data.participants);
          break;
        case "raise-hand":
          if (isTeacher) {
            setParticipants(prev =>
              prev.map(p => p.id === data.userId ? { ...p, handRaised: true } : p)
            );
          } else if (data.userId === user.id) {
            setHandRaised(true);
          }
          break;
        case "unmute":
          if (!isTeacher && data.userId === user.id) {
            const audioTrack = localStream?.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = true;
              setAudioEnabled(true);
            }
          }
          if (isTeacher) {
            setParticipants(prev =>
              prev.map(p => p.id === data.userId ? { ...p, handRaised: false } : p)
            );
          }
          break;
        case "screen-share":
          // Teacher changed sharing state — update UI. The teacher will renegotiate and send new tracks.
          if (data.userId === teacherId && data.userId !== user.id) {
            setTeacherScreenSharing(data.isSharing);
            // if teacher stopped sharing, student main video should fall back to the teacher camera track
            // That's handled naturally by the renegotiation sequence initiated by the teacher.
          }
          break;
        default:
          break;
      }
    };

    ws.current.onclose = () => console.log("❌ WebSocket disconnected");
  };

  // ---------------- WebRTC Signaling ----------------
  const createPeerConnection = (otherId) => {
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.current?.send(JSON.stringify({
          type: "signaling",
          data: { type: "candidate", candidate: event.candidate },
          target: otherId
        }));
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams(prev => {
        const updated = { ...prev, [otherId]: stream };
        // If this track belongs to teacher and mainVideo exists, set it (mute screen-share to help autoplay)
        if (parseInt(otherId) === teacherId && mainVideoRef.current) {
          mainVideoRef.current.srcObject = stream;
          // If teacher is screen-sharing, mute main video to prevent autoplay blocking (screen-share audio is false in our flow)
          if (teacherScreenSharing || (stream && stream.getAudioTracks && stream.getAudioTracks().length === 0)) {
            try { mainVideoRef.current.muted = true; } catch (e) {}
          }
          mainVideoRef.current.play().catch(() => {});
        }
        return updated;
      });
    };

    // Add local tracks (if available)
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // store pc
    setPeerConnections(prev => ({ ...prev, [otherId]: pc }));
    return pc;
  };

  const shouldInitiate = (myId, otherId) => {
    return myId > otherId;
  };

  useEffect(() => {
    if (joined && localStream) {
      participants.forEach(p => {
        if (p.id !== user.id && !peerConnections[p.id]) {
          const pc = createPeerConnection(p.id);
          if (shouldInitiate(user.id, p.id)) {
            pc.createOffer()
              .then(offer => pc.setLocalDescription(offer))
              .then(() => {
                ws.current?.send(JSON.stringify({
                  type: "signaling",
                  data: { type: "offer", offer: pc.localDescription },
                  target: p.id
                }));
              })
              .catch(err => console.error("Error creating offer", err));
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, joined, localStream]);

  const handleSignaling = async (innerData, sender) => {
    sender = parseInt(sender);
    let pc = peerConnections[sender];
    if (!pc) {
      pc = createPeerConnection(sender);
    }

    try {
      switch (innerData.type) {
        case "offer":
          await pc.setRemoteDescription(new RTCSessionDescription(innerData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.current?.send(JSON.stringify({
            type: "signaling",
            data: { type: "answer", answer: pc.localDescription },
            target: sender
          }));
          // process pending candidates if any
          if (pc.pendingCandidates && pc.remoteDescription) processPendingCandidates(pc, sender);
          break;
        case "answer":
          await pc.setRemoteDescription(new RTCSessionDescription(innerData.answer));
          if (pc.pendingCandidates && pc.remoteDescription) processPendingCandidates(pc, sender);
          break;
        case "candidate":
          // Only add candidate if remote description is set
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(innerData.candidate)).catch(err => console.error("Add ICE candidate error:", err));
          } else {
            console.warn(`Deferred ICE candidate for ${sender} until remote description is set`);
            pc.pendingCandidates = pc.pendingCandidates || [];
            pc.pendingCandidates.push(innerData.candidate);
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error("Error handling signaling", err);
    }
  };

  const processPendingCandidates = (pc, sender) => {
    if (pc.pendingCandidates && pc.remoteDescription) {
      pc.pendingCandidates.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err =>
          console.error(`Error adding deferred candidate for ${sender}:`, err)
        );
      });
      delete pc.pendingCandidates;
    }
  };

  // ---------------- Meeting Controls ----------------
  const startMeetingTimer = () => {
    let startTime = Date.now();
    meetingTimer.current = setInterval(() => {
      const elapsedTime = Date.now() - startTime;
      const hours = Math.floor(elapsedTime / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((elapsedTime % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((elapsedTime % 60000) / 1000).toString().padStart(2, '0');
      setMeetingTime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  // MAIN fix: Always renegotiate all PCs when teacher starts/stops screen share
  const toggleScreenShare = async () => {
    if (!isTeacher) return;

    if (!screenSharing) {
      // Start screen share
      try {
        const newScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });
        setScreenStream(newScreenStream);

        // Replace or add the video sender on each peer connection
        const videoTrack = newScreenStream.getVideoTracks()[0];
        await Promise.all(Object.entries(peerConnections).map(async ([otherId, pc]) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(videoTrack).catch(err => console.warn("replaceTrack error:", err));
          } else {
            // if no sender exists, add track (and renegotiate)
            try {
              pc.addTrack(videoTrack, newScreenStream);
            } catch (e) {
              console.warn("addTrack failed:", e);
            }
          }

          // Renegotiate with everyone (teacher initiates)
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.current?.send(JSON.stringify({
            type: "signaling",
            data: { type: "offer", offer: pc.localDescription },
            target: otherId
          }));
        }));

        // set local teacher preview to show screen
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = newScreenStream;
          screenShareVideoRef.current.muted = true;
          screenShareVideoRef.current.play().catch(() => {});
        }

        setScreenSharing(true);
        setTeacherScreenSharing(true);
        ws.current?.send(JSON.stringify({
          type: "screen-share",
          userId: user.id,
          isSharing: true
        }));

        // When screen stops (via browser UI), revert
        videoTrack.onended = () => toggleScreenShare();
      } catch (error) {
        console.error("Error sharing screen:", error);
      }
    } else {
      // Stop screen share - switch back to camera
      try {
        // Stop screen tracks
        if (screenStream) {
          screenStream.getTracks().forEach(t => t.stop());
          setScreenStream(null);
        }

        // Get a new camera stream
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isTeacher,
        });

        // Replace or add video sender for each pc with camera track
        const cameraTrack = cameraStream.getVideoTracks()[0];
        await Promise.all(Object.entries(peerConnections).map(async ([otherId, pc]) => {
          const sender = pc.getSenders().find(s => s.track?.kind === "video");
          if (sender) {
            await sender.replaceTrack(cameraTrack).catch(err => console.warn("replaceTrack error:", err));
          } else {
            try {
              pc.addTrack(cameraTrack, cameraStream);
            } catch (e) {
              console.warn("addTrack failed:", e);
            }
          }

          // Renegotiate with everyone (teacher initiates)
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.current?.send(JSON.stringify({
            type: "signaling",
            data: { type: "offer", offer: pc.localDescription },
            target: otherId
          }));
        }));

        // Update local stream preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = cameraStream;
        }
        setLocalStream(cameraStream);

        setScreenSharing(false);
        setTeacherScreenSharing(false);
        ws.current?.send(JSON.stringify({
          type: "screen-share",
          userId: user.id,
          isSharing: false
        }));
      } catch (error) {
        console.error("Error switching back to camera:", error);
      }
    }
  };

  // ---------------- Chat ----------------
  const sendMessage = () => {
    if (messageInput.trim()) {
      const newMessage = {
        id: Date.now(),
        message: messageInput,
        sender: user?.name || 'You',
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([...messages, newMessage]);
      ws.current?.send(JSON.stringify({ type: "chat", message: messageInput }));
      setMessageInput('');
    }
  };

  // ---------------- Meeting Join/Leave ----------------
  const joinMeeting = () => {
    setJoined(true);
    connectWebSocket();
    initializeMeetingMedia();
  };

  const leaveCall = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    if (screenStream) screenStream.getTracks().forEach(track => track.stop());
    if (meetingTimer.current) clearInterval(meetingTimer.current);
    Object.values(peerConnections).forEach(pc => pc.close());
    if (ws.current) { ws.current.close(); ws.current = null; }
    setJoined(false);
    setScreenSharing(false);
    setTeacherScreenSharing(false);
    setHandRaised(false);
    setShowEmoji(false);
    setEmoji('');
    setPeerConnections({});
    setRemoteStreams({});
    setParticipants([]);
  };

  const handleRaiseHand = () => {
    ws.current?.send(JSON.stringify({ type: "raise-hand", userId: user.id }));
  };

  const unmuteStudent = (studentId) => {
    ws.current?.send(JSON.stringify({ type: "unmute", userId: studentId }));
  };

  const handleEmoji = (emojiVal) => {
    setShowEmoji(true);
    setEmoji(emojiVal);
    setTimeout(() => { setShowEmoji(false); setEmoji(''); }, 2000);
  };

  // UI Logic for Videos
  const teacher = participants.find(p => p.role === 'teacher');
  const teacherId = teacher?.id;
  console.log("Teacher ID:", teacherId);
  const mainStream = isTeacher ? localStream : remoteStreams[teacherId];
  console.log("Main Stream:", mainStream);
  const studentStreams = Object.entries(remoteStreams).filter(([id]) => parseInt(id) !== user.id && parseInt(id) !== teacherId);

  useEffect(() => {
    if (mainVideoRef.current && mainStream) {
      mainVideoRef.current.srcObject = mainStream;
      mainVideoRef.current.play().catch(() => {});
    }
  }, [mainStream]);

  // ---------------- UI ----------------
  if (!joined) {
    return (
      <div className="prejoin-container">
        <div className="prejoin-header">
          <div className="google-meet-logo">Live Meet</div>
          <div className="meeting-info">
            <h2>{user?.name}</h2>
            <p>Do you want people to see and hear you in the meeting?</p>
          </div>
        </div>
        <div className="video-preview">
          <video ref={localVideoRef} autoPlay muted className="preview-video"></video>
        </div>
        <div className="media-controls-prejoin">
          <button onClick={toggleVideo} className="control-button-prejoin">
            {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
            <span>{videoEnabled ? 'Camera on' : 'Camera off'}</span>
          </button>
          {isTeacher && (
            <button onClick={toggleAudio} className="control-button-prejoin">
              {audioEnabled ? <MicIcon /> : <MicOffIcon />}
              <span>{audioEnabled ? 'Microphone on' : 'Microphone off'}</span>
            </button>
          )}
        </div>
        <div className="join-actions">
          <button onClick={joinMeeting} className="join-button">Join now</button>
          <div className="meeting-id">Meeting ID: {courseId}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-container">
      {/* Header */}
      <div className="meeting-header">
        <div className="meeting-info-header">
          <span className="meeting-time">{meetingTime}</span>
          <span className="meeting-id-header">Meeting ID: {courseId}</span>
          <span className="user-role">({user?.role})</span>
        </div>
        <div className="meeting-title">{user?.name} (You, {screenSharing ? 'presenting' : 'joined'})</div>
      </div>

      {/* Video Area */}
      <div className="video-container">
        <div className="remote-video">
          {(isTeacher && screenSharing && screenStream) ? (
            <video
              ref={screenShareVideoRef}
              autoPlay
              muted
              className="main-video"
            ></video>
          ) : mainStream ? (
            <video
              ref={mainVideoRef}
              autoPlay
              playsInline
              muted={isTeacher}
              className="main-video"
            />
          ) : (
            <div className="no-participants">
              <PersonIcon />
              <p>No other participants</p>
            </div>
          )}
        </div>

        {/* Student video strip (grid-like scroll) */}
        {studentStreams.length > 0 && (
          <div className="student-videos-scroll">
            {studentStreams.map(([id, stream]) => (
              <StudentVideo key={id} stream={stream} />
            ))}
          </div>
        )}

        {/* Local video thumbnail (always camera) */}
        <div className="local-video">
          <video ref={localVideoRef} autoPlay muted className="thumbnail-video"></video>
          {showEmoji && <div className="emoji-overlay">{emoji}</div>}
          {handRaised && <PanToolAltIcon className="hand-raised-icon" />}
        </div>
      </div>

      {/* Controls */}
      <div className="meeting-controls">
        {isTeacher ? (
          <>
            <button onClick={toggleAudio} className="control-button">{audioEnabled ? <MicIcon /> : <MicOffIcon />}</button>
            <button onClick={toggleVideo} className="control-button">{videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}</button>
            <button onClick={toggleScreenShare} className="control-button">{screenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}</button>
          </>
        ) : (
          <>
            <button className="control-button disabled"><MicOffIcon /><span>Muted</span></button>
            <button onClick={toggleVideo} className="control-button">{videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}</button>
          </>
        )}

        <button onClick={() => setChatOpen(!chatOpen)} className="control-button"><ChatBubbleOutlineIcon /></button>
        {!isTeacher && <button onClick={handleRaiseHand} className="control-button"><PanToolAltIcon /></button>}
        <button onClick={() => handleEmoji('👍')} className="control-button"><EmojiEmotionsIcon /></button>
        <button onClick={() => handleEmoji('👏')} className="control-button"><EmojiEmotionsIcon /></button>
        <button onClick={() => setParticipantsOpen(!participantsOpen)} className="control-button"><GroupsIcon /></button>
        <button onClick={leaveCall} className="control-button leave-button"><CallEndIcon /><span>Leave</span></button>
      </div>

      {/* Participants info (count) */}
      <div className="participants-info">
        <GroupsIcon /><span>Participants: {participants.length}</span>
      </div>

      {/* Raised hands panel for teacher */}
      {isTeacher && participants.some(p => p.handRaised) && (
        <div className="raised-hands-panel">
          <h4>Raised Hands</h4>
          {participants.filter(p => p.handRaised).map(p => (
            <div key={p.id} className="student-box">
              <span>{p.name}</span>
              <button onClick={() => unmuteStudent(p.id)}>Unmute</button>
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      {chatOpen && (
        <div className="chat-sidebar">
          <div className="chat-header">
            <h4>In-call messages</h4>
            <button onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className="message"><b>{m.sender}</b>: {m.message} <small>{m.timestamp}</small></div>
            ))}
          </div>
          <div className="chat-input-container">
            <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
            <button onClick={sendMessage}>↑</button>
          </div>
        </div>
      )}

      {/* Participants sidebar */}
      {participantsOpen && (
        <div className="participants-sidebar">
          <div className="participants-header">
            <h4>Participants ({participants.length})</h4>
            <button onClick={() => setParticipantsOpen(false)}>×</button>
          </div>
          <div className="participants-list">
            {participants.map((p, i) => (
              <div key={i} className="participant-item">
                <b>{p.name}</b> ({p.role}) {p.handRaised && <PanToolAltIcon />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassPage;
