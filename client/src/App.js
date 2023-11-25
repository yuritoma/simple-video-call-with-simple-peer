import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import styled from 'styled-components';

const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
  width: 50%;
  height: 50%;
`;

const App = () => {
  const [yourID, setYourID] = useState('');
  const [users, setUsers] = useState({});
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();

  useEffect(() => {
    console.log('Connecting to Socket.IO server...');

    socket.current = io.connect('http://localhost:8000/', {
      withCredentials: true,
      transports: ['websocket'],
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((userMediaStream) => {
        console.log('Got user media stream:', userMediaStream);
        setStream(userMediaStream);

        if (userVideo.current) {
          userVideo.current.srcObject = userMediaStream;
        }
      })
      .catch((error) => console.error('Error accessing media devices:', error));

    socket.current.on('yourID', (id) => {
      console.log('Received yourID:', id);
      setYourID(id);
    });

    socket.current.on('allUsers', (receivedUsers) => {
      console.log('Received allUsers:', receivedUsers);
      setUsers(receivedUsers);
    });

    socket.current.on('hey', (data) => {
      console.log('Received hey:', data);
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    return () => {
      // Cleanup function when component unmounts
      socket.current.disconnect();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  const callPeer = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on('signal', (data) => {
      socket.current.emit('callUser', { userToCall: id, signalData: data, from: yourID });
    });

    peer.on('stream', (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    socket.current.on('callAccepted', (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });
  };

  const acceptCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on('signal', (data) => {
      socket.current.emit('acceptCall', { signal: data, to: caller });
    });

    peer.on('stream', (partnerStream) => {
      partnerVideo.current.srcObject = partnerStream;
    });

    peer.signal(callerSignal);
  };

  const UserVideo = stream && <Video autoPlay playsInline muted ref={userVideo} />;
  const PartnerVideo = callAccepted && <Video autoPlay playsInline ref={partnerVideo} />;

  let incomingCall;
  if (receivingCall) {
    incomingCall = (
      <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
      </div>
    );
  }

  return (
    <Container>
      <Row>
        {UserVideo}
        {PartnerVideo}
      </Row>
      <Row>
        {Object.keys(users).map((key) => {
          if (key === yourID) {
            return null;
          }
          return (
            <button key={key} onClick={() => callPeer(key)}>
              Call {key}
            </button>
          );
        })}
      </Row>
      <Row>{incomingCall}</Row>
    </Container>
  );
};

export default App;
