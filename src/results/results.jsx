import React, {useEffect, useState, useRef} from 'react';


const websocketUrl = "wss://startup.drewharts.com:8080";

export function Results() {
    // New state variable for storing chat messages
    const [messages, setMessages] = useState([]);
    
    // New state variable for storing user's input
    const [inputMessage, setInputMessage] = useState("");

    const socket = useRef(null);
    
    const [profile, setProfile] = useState(null);
    const [topArtists, setTopArtists] = useState(null);
    const [firstTracks, setFirstTracks] = useState(null);
    const [songData, setSongData] = useState(null);
    const [artist1Songs, setArtist1Songs] = useState([]);
    const [artist2Songs, setArtist2Songs] = useState([]);
    const [artist3Songs, setArtist3Songs] = useState([]);
    const clientId = "34e8bb8fea5945318f1e45de7e51b9b4"; // Replace with your Spotify client ID

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
            redirectToAuthCodeFlow(clientId);
        } else {
            getAccessToken(clientId, code).then(token => {
                fetchTop(token).then(artistData => {
                  setTopArtists(artistData);
                  getTop3Artists(artistData).then(firstTracks => {
                    setFirstTracks(firstTracks);
                    fetchSongs(firstTracks); // Move the fetchSongs call here
                    console.log("FIRST TRACKS HERE: " + firstTracks);
                  });
                });
                fetchProfile(token).then(profileData => {
                  setProfile(profileData);
                });
              });
        }

        // Adjust the webSocket protocol to what is being used for HTTP
        const protocol = window.location.protocol === 'http:' ? 'ws' : 'wss';
        socket.current = new WebSocket(`${protocol}://${window.location.host}/ws`);

        // Display that we have opened the webSocket
        socket.current.onopen = (event) => {
            // appendMsg('system', 'websocket', 'connected');
            console.log("connected");
        };
        socket.current.onclose = (event) => {
            // appendMsg('system', 'websocket', 'disconnected');
            console.log("disconnected");
        }

        socket.current.onmessage = (event) => {
            setMessages(prevMessages => [...prevMessages, event.data]);
        };

        // Cleanup before unmounting or when dependencies change
        return () => {
            socket.current.close();
        };
    }, [clientId]);

    const getTop3Artists = async (topArtists) => {
        const artistJSON = JSON.stringify({
            artist1: topArtists.items[0].name,
            artist2: topArtists.items[1].name,
            artist3: topArtists.items[2].name
        })
        return artistJSON;
    }

    const generateCodeChallenge = async (codeVerifier) => {
        const data = new TextEncoder().encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    };

    const generateCodeVerifier = (length) => {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

    const redirectToAuthCodeFlow = async (clientId) => {
        const verifier = generateCodeVerifier(128);
        const challenge = await generateCodeChallenge(verifier);
    
        localStorage.setItem("verifier", verifier);
    
        const params = new URLSearchParams();
        params.append("client_id", clientId);
        params.append("response_type", "code");
        params.append("redirect_uri", "https://startup.drewharts.com/results");
        params.append("scope", "user-top-read");
        params.append("code_challenge_method", "S256");
        params.append("code_challenge", challenge);
    
        document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
    };

    const getAccessToken = async (clientId, code) => {
        const verifier = localStorage.getItem("verifier");
    
        const params = new URLSearchParams();
        params.append("client_id", clientId);
        params.append("grant_type", "authorization_code");
        params.append("code", code);
        params.append("redirect_uri", "https://startup.drewharts.com/results");
        params.append("code_verifier", verifier);
    
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });
    
        const { access_token } = await result.json();
        return access_token;
    };

    const fetchTop = async (token) => {
        const result = await fetch("https://api.spotify.com/v1/me/top/artists?time_range=short_term", {
            method: "GET", headers: { Authorization: `Bearer ${token}` }
        });
    
        if (!result.ok) {
            console.error(`Error: HTTP ${result.status} - ${result.statusText}`);
            return null;
        }
    
        return await result.json();
    };


    const fetchProfile = async (token) => {
        const result = await fetch("https://api.spotify.com/v1/me", {
            method: "GET", headers: { Authorization: `Bearer ${token}` }
        });
    
        return await result.json();
    };

    const fetchSongs = async (firstTracks) => {
        try {
          const response = await fetch("/api/chatGPT/", {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ firstTracks }), // Wrap firstTracks in an object to ensure it's sent as JSON
          });
      
          if (!response.ok) {
            throw new Error('Request failed with status ' + response.status);
          }
      
          const data = await response.json();
          //figure out a way to display data here
          console.log(data.responseOne);
          setArtist1Songs(data.responseOne);
          console.log(data.responseTwo);
          setArtist2Songs(data.responseTwo);
          console.log(data.responseThree);
          setArtist3Songs(data.responseThree);
        } catch (error) {
          console.error("There was an error with the fetch:", error);
          // Handle the error
        }
      };

      const sendMessage = () => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            socket.current.send(inputMessage);
            setInputMessage(""); // Clear the input after sending
        } else {
            console.log("WEBSOCKET ISN'T OPEN");
        }
    };
      


    return(
        <main>
        <section id="top data">
          <h1>Results</h1>
          <p>Welcome {profile ? profile.display_name : ""}</p>
          <div id="database placeholder"></div>
          <h2>Artists</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <h3>{topArtists ? topArtists.items[0].name : ""}</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>{artist1Songs ? artist1Songs : ""}</li>
                <li><span id="artist1Song2"></span></li>
                <li><span id="artist1Song3"></span></li>
                <li><span id="artist1Song4"></span></li>
                <li><span id="artist1Song5"></span></li>
              </ul>
            </li>
            <li>
              <h3>{topArtists ? topArtists.items[1].name : ""}</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>{artist2Songs ? artist2Songs : ""}</li>
                <li><span id="artist2Song2"></span></li>
                <li><span id="artist2Song3"></span></li>
                <li><span id="artist2Song4"></span></li>
                <li><span id="artist2Song5"></span></li>
              </ul>
            </li>
            <li>
              <h3>{topArtists ? topArtists.items[2].name : ""}</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>{artist3Songs ? artist3Songs : ""}</li>
                <li><span id="artist3Song2"></span></li>
                <li><span id="artist3Song3"></span></li>
                <li><span id="artist3Song4"></span></li>
                <li><span id="artist3Song5"></span></li>
              </ul>
            </li>
          </ul>
      </section>

      <section id="chat">
            <h2>Live Chat</h2>
            <ul>
                {messages.map((message, index) => (
                    <li key={index}>{message}</li>
                ))}
            </ul>
            <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)} />
            <button onClick={sendMessage}>Send</button>
        </section>

      </main>
    )
}
